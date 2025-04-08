from flask import Blueprint, request, jsonify, session, redirect, url_for, render_template, flash
from flask_login import login_user, login_required, logout_user, current_user
from werkzeug.security import generate_password_hash, check_password_hash
from werkzeug.utils import secure_filename
import os
from datetime import datetime

from models import db, User, Profile

# Skapa en Blueprint
auth = Blueprint('auth', __name__)

# Konfigurera uppladdningsmapp
UPLOAD_FOLDER = 'static'
PROFILE_PICS_FOLDER = os.path.join(UPLOAD_FOLDER, 'profile_pics')
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif'}

# Funktion för att kontrollera filändelser
def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@auth.route('/register', methods=['GET', 'POST'])
def register():
    """Skapa ett nytt användarkonto"""
    if current_user.is_authenticated:
        return redirect(url_for('main.index'))
        
    if request.method == 'POST':
        # Hantera olika inmatningsformat (JSON API/Formulär)
        if request.content_type and 'application/json' in request.content_type:
            data = request.json
            username = data.get('username')
            email = data.get('email')
            password = data.get('password')
            confirm_password = data.get('confirm_password')
            favorite_genre = data.get('favorite_genre', '')
        else:
            username = request.form.get('username')
            email = request.form.get('email')
            password = request.form.get('password')
            confirm_password = request.form.get('confirm_password')
            favorite_genre = request.form.get('favorite_genre', '')
        
        # Validera inmatningen
        if not username or not email or not password:
            if 'application/json' in request.content_type:
                return jsonify({"error": "Alla fält måste fyllas i"}), 400
            flash('Alla fält måste fyllas i')
            return render_template('register.html')
            
        if password != confirm_password:
            if 'application/json' in request.content_type:
                return jsonify({"error": "Lösenorden matchar inte"}), 400
            flash('Lösenorden matchar inte')
            return render_template('register.html')
            
        # Kolla om användare redan finns
        existing_user = User.query.filter_by(username=username).first()
        if existing_user:
            if 'application/json' in request.content_type:
                return jsonify({"error": "Användarnamnet är redan taget"}), 400
            flash('Användarnamnet är redan taget')
            return render_template('register.html')
            
        existing_email = User.query.filter_by(email=email).first()
        if existing_email:
            if 'application/json' in request.content_type:
                return jsonify({"error": "E-postadressen är redan registrerad"}), 400
            flash('E-postadressen är redan registrerad')
            return render_template('register.html')
        
        # Hantera profilbild (om den finns)
        profile_pic = 'default.jpg'
        if request.files and 'profile_picture' in request.files:
            file = request.files['profile_picture']
            if file.filename != '' and allowed_file(file.filename):
                filename = secure_filename(f"{username}_{int(datetime.utcnow().timestamp())}_profile.{file.filename.rsplit('.', 1)[1].lower()}")
                file.save(os.path.join(PROFILE_PICS_FOLDER, filename))
                profile_pic = filename
        
        # Skapa användare och profil
        new_user = User(username=username, email=email)
        new_user.set_password(password)
        db.session.add(new_user)
        db.session.commit()
        
        new_profile = Profile(
            user_id=new_user.id,
            profile_picture=profile_pic,
            favorite_genre=favorite_genre
        )
        db.session.add(new_profile)
        db.session.commit()
        
        # Logga in användaren direkt
        login_user(new_user)
        
        if 'application/json' in request.content_type:
            return jsonify({
                "success": True,
                "message": "Registrering lyckades!",
                "user": {
                    "id": new_user.id,
                    "username": new_user.username
                }
            }), 201
        
        flash('Registrering lyckades!')
        return redirect(url_for('profile.view_profile', username=new_user.username))
        
    return render_template('register.html')

@auth.route('/login', methods=['GET', 'POST'])
def login():
    """Logga in en befintlig användare"""
    if current_user.is_authenticated:
        return redirect(url_for('main.index'))
        
    if request.method == 'POST':
        # Hantera olika inmatningsformat (JSON API/Formulär)
        if request.content_type and 'application/json' in request.content_type:
            data = request.json
            username = data.get('username')
            password = data.get('password')
        else:
            username = request.form.get('username')
            password = request.form.get('password')
        
        # Validera inmatningen
        if not username or not password:
            if 'application/json' in request.content_type:
                return jsonify({"error": "Användarnamn och lösenord krävs"}), 400
            flash('Användarnamn och lösenord krävs')
            return render_template('login.html')
        
        # Försök hitta användaren
        user = User.query.filter_by(username=username).first()
        
        if not user or not user.check_password(password):
            if 'application/json' in request.content_type:
                return jsonify({"error": "Ogiltigt användarnamn eller lösenord"}), 401
            flash('Ogiltigt användarnamn eller lösenord')
            return render_template('login.html')
        
        # Logga in användaren
        login_user(user, remember=True)
        
        # Spara användardata i sessionen
        session['user_id'] = user.id
        
        if 'application/json' in request.content_type:
            return jsonify({
                "success": True,
                "message": "Inloggning lyckades!",
                "user": {
                    "id": user.id,
                    "username": user.username
                }
            })
        
        # Omdirigera till nästa sida eller profilen
        next_page = request.args.get('next')
        if next_page:
            return redirect(next_page)
        return redirect(url_for('profile.view_profile', username=user.username))
        
    return render_template('login.html')

@auth.route('/logout')
@login_required
def logout():
    """Logga ut användaren"""
    logout_user()
    session.pop('user_id', None)
    
    # Hantera API-anrop
    if request.content_type and 'application/json' in request.content_type:
        return jsonify({"success": True, "message": "Utloggad"})
        
    flash('Du har loggats ut')
    return redirect(url_for('main.index'))

@auth.route('/auth-status')
def auth_status():
    """Kontrollera inloggningsstatus (för API-anrop från frontend)"""
    if current_user.is_authenticated:
        profile = Profile.query.filter_by(user_id=current_user.id).first()
        
        return jsonify({
            "logged_in": True,
            "user": {
                "id": current_user.id,
                "username": current_user.username,
                "profile_picture": profile.profile_picture if profile else "default.jpg"
            }
        })
    
    return jsonify({"logged_in": False})