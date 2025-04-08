# routes/main_routes.py
from flask import Blueprint, render_template, redirect, url_for, send_from_directory
from flask_login import current_user
import os

# Skapa en Blueprint
main = Blueprint('main', __name__)

@main.route('/')
def index():
    """Landningssida/startsida"""
    if current_user.is_authenticated:
        return redirect(url_for('main.home'))
    return render_template('landing.html')

@main.route('/home')
def home():
    """Hemsida med inläggsflöde"""
    return render_template('home.html')

@main.route('/static/<path:filename>')
def static_files(filename):
    """Servera statiska filer"""
    return send_from_directory('static', filename)

@main.route('/about')
def about():
    """Visa information om webbplatsen"""
    return render_template('about.html')