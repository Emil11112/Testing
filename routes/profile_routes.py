from flask import Blueprint, request, jsonify, render_template, flash, redirect, url_for
from flask_login import login_required, current_user
from werkzeug.utils import secure_filename
import os
from datetime import datetime

# Importera modellerna med relativ import
from models import db, User, Profile, Song, Album, Artist
from services.spotify_api import SpotifySearch

# Skapa en Blueprint
profile = Blueprint('profile', __name__)

# Konfigurera uppladdningsmapp
UPLOAD_FOLDER = 'static'
PROFILE_PICS_FOLDER = os.path.join(UPLOAD_FOLDER, 'profile_pics')
SONG_PICS_FOLDER = os.path.join(UPLOAD_FOLDER, 'song_pics')
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif'}

# Skapa mapparna om de inte finns
os.makedirs(PROFILE_PICS_FOLDER, exist_ok=True)
os.makedirs(SONG_PICS_FOLDER, exist_ok=True)

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@profile.route('/profile/<username>')
def view_profile(username):
    """Visa användarprofil"""
    user = User.query.filter_by(username=username).first_or_404()
    profile_data = Profile.query.filter_by(user_id=user.id).first_or_404()
    
    # Hämta favoritlåtar, album och artister
    favorite_songs = Song.query.join(user.favorite_songs).all() if hasattr(user, 'favorite_songs') else []
    favorite_albums = Album.query.join(user.favorite_albums).all() if hasattr(user, 'favorite_albums') else []
    favorite_artists = Artist.query.join(user.favorite_artists).all() if hasattr(user, 'favorite_artists') else []
    
    # Kolla om den inloggade användaren följer profilanvändaren
    is_following = False
    if current_user.is_authenticated:
        is_following = current_user.is_following(user) if hasattr(current_user, 'is_following') else False
    
    return render_template('profile.html', 
                          user=user, 
                          profile=profile_data, 
                          songs=favorite_songs,
                          albums=favorite_albums,
                          artists=favorite_artists,
                          is_following=is_following)

@profile.route('/api/profile/<username>')
def get_profile_api(username):
    """API-rutt för att hämta profildata"""
    user = User.query.filter_by(username=username).first()
    
    if not user:
        return jsonify({"error": "Användaren finns inte"}), 404
        
    profile_data = Profile.query.filter_by(user_id=user.id).first()
    
    if not profile_data:
        return jsonify({"error": "Profilen finns inte"}), 404
    
    # Hämta favoritlåtar
    favorite_songs = []
    if hasattr(user, 'favorite_songs'):
        favorite_songs = [{
            "id": song.id,
            "title": song.title,
            "artist": song.artist,
            "cover_url": song.cover_url,
            "spotify_url": song.spotify_url if hasattr(song, 'spotify_url') else None,
            "embed_url": song.embed_url if hasattr(song, 'embed_url') else None
        } for song in Song.query.join(user.favorite_songs).all()]
    
    # Hämta favoritalbum
    favorite_albums = []
    if hasattr(user, 'favorite_albums'):
        favorite_albums = [{
            "id": album.id,
            "title": album.title,
            "artist": album.artist,
            "cover_url": album.cover_url,
            "spotify_url": album.spotify_url if hasattr(album, 'spotify_url') else None
        } for album in Album.query.join(user.favorite_albums).all()]
    
    # Hämta favoritartister
    favorite_artists = []
    if hasattr(user, 'favorite_artists'):
        favorite_artists = [{
            "id": artist.id,
            "name": artist.name,
            "cover_url": artist.cover_url,
            "spotify_url": artist.spotify_url if hasattr(artist, 'spotify_url') else None
        } for artist in Artist.query.join(user.favorite_artists).all()]
    
    # Kolla om användaren som tittar följer profilanvändaren
    is_following = False
    followers_count = 0
    following_count = 0
    
    if hasattr(user, 'followers') and hasattr(user, 'following'):
        followers_count = user.followers.count()
        following_count = user.following.count()
        
        if current_user.is_authenticated and hasattr(current_user, 'is_following'):
            is_following = current_user.is_following(user)
    
    return jsonify({
        "username": user.username,
        "email": user.email if hasattr(user, 'email') else None,
        "profile_picture": profile_data.profile_picture,
        "bio": profile_data.bio or "",
        "favorite_genre": profile_data.favorite_genre,
        "song_of_the_day": {
            "title": profile_data.sotd_title or "",
            "artist": profile_data.sotd_artist or "",
            "picture": profile_data.song_picture or ""
        },
        "favorite_songs": favorite_songs,
        "favorite_albums": favorite_albums,
        "favorite_artists": favorite_artists,
        "is_following": is_following,
        "followers_count": followers_count,
        "following_count": following_count
    })

@profile.route('/edit-profile', methods=['GET', 'POST'])
@login_required
def edit_profile():
    """Redigera användarprofil"""
    user = current_user
    profile_data = Profile.query.filter_by(user_id=user.id).first()
    
    if not profile_data:
        profile_data = Profile(user_id=user.id)
        db.session.add(profile_data)
        db.session.commit()
    
    if request.method == 'POST':
        # Uppdatera användarinformation
        if request.form.get('email') and hasattr(user, 'email'):
            # Kolla om e-posten redan används av en annan användare
            existing_email = User.query.filter(User.email == request.form.get('email'), User.id != user.id).first()
            if existing_email:
                flash('E-posten används redan av en annan användare')
                return redirect(url_for('profile.edit_profile'))
                
            user.email = request.form.get('email')
        
        # Uppdatera profilinformation
        profile_data.bio = request.form.get('bio', '')
        profile_data.favorite_genre = request.form.get('favorite_genre', '')
        
        if hasattr(profile_data, 'sotd_title'):
            profile_data.sotd_title = request.form.get('sotd_title', '')
        
        if hasattr(profile_data, 'sotd_artist'):
            profile_data.sotd_artist = request.form.get('sotd_artist', '')
        
        # Hantera favoritlåtar
        if hasattr(user, 'favorite_songs'):
            # Rensa befintliga kopplingar
            user.favorite_songs = []
            
            # Lägg till nya låtar
            for i in range(5):  # Upp till 5 favoritlåtar
                title = request.form.get(f'song_title_{i}')
                artist = request.form.get(f'song_artist_{i}')
                
                if title and artist:
                    # Sök efter låten i databasen eller via Spotify API
                    song = Song.query.filter_by(title=title, artist=artist).first()
                    
                    if not song:
                        # Sök via Spotify API
                        spotify_search = SpotifySearch(f"{title} {artist}")
                        song_data = spotify_search.get_track()
                        
                        if song_data:
                            song = Song(
                                title=song_data["name"],
                                artist=song_data["artist"],
                                album=song_data.get("album", ""),
                                cover_url=song_data["cover_url"],
                                spotify_url=song_data.get("spotify_url", ""),
                                embed_url=song_data.get("embed_link", "")
                            )
                            db.session.add(song)
                            db.session.commit()
                    
                    if song:
                        user.favorite_songs.append(song)
        
        # Hantera profilbild
        if 'profile_picture' in request.files and request.files['profile_picture'].filename:
            file = request.files['profile_picture']
            if file and allowed_file(file.filename):
                filename = secure_filename(f"{user.username}_{int(datetime.utcnow().timestamp())}_profile.{file.filename.rsplit('.', 1)[1].lower()}")
                file.save(os.path.join(PROFILE_PICS_FOLDER, filename))
                profile_data.profile_picture = filename
        
        # Hantera Song of the Day-bild
        if 'song_picture' in request.files and request.files['song_picture'].filename and hasattr(profile_data, 'song_picture'):
            file = request.files['song_picture']
            if file and allowed_file(file.filename):
                filename = secure_filename(f"{user.username}_{int(datetime.utcnow().timestamp())}_song.{file.filename.rsplit('.', 1)[1].lower()}")
                file.save(os.path.join(SONG_PICS_FOLDER, filename))
                profile_data.song_picture = filename
        
        db.session.commit()
        flash('Profilen uppdaterad!')
        return redirect(url_for('profile.view_profile', username=user.username))
    
    return render_template('edit_profile.html', user=user, profile=profile_data)

@profile.route('/api/profile/music-search', methods=['GET'])
@login_required
def search_music():
    """Sök efter musik via Spotify API"""
    query = request.args.get('q', '')
    search_type = request.args.get('type', 'track')  # track, album, eller artist
    
    if not query:
        return jsonify({"error": "Sökterm krävs"}), 400
    
    spotify_search = SpotifySearch(query)
    
    if search_type == 'track':
        result = spotify_search.get_track()
    elif search_type == 'album':
        result = spotify_search.get_album()
    elif search_type == 'artist':
        result = spotify_search.get_artist()
    else:
        return jsonify({"error": "Ogiltig söktyp"}), 400
    
    if not result:
        return jsonify({"error": "Inga resultat hittades"}), 404
    
    return jsonify(result)

@profile.route('/api/profile/add-favorite', methods=['POST'])
@login_required
def add_favorite():
    """Lägg till en låt, album eller artist som favorit"""
    data = request.json
    item_type = data.get('type')  # 'song', 'album', eller 'artist'
    item_data = data.get('data')
    
    if not item_type or not item_data:
        return jsonify({"error": "Typ och data krävs"}), 400
    
    user = current_user
    
    # Hantera de olika typerna
    if item_type == 'song' and hasattr(user, 'favorite_songs'):
        # Sök efter låten eller skapa den
        song = Song.query.filter_by(title=item_data.get('title'), artist=item_data.get('artist')).first()
        
        if not song:
            song = Song(
                title=item_data.get('title'),
                artist=item_data.get('artist'),
                album=item_data.get('album', ''),
                cover_url=item_data.get('cover_url'),
                spotify_url=item_data.get('spotify_url'),
                embed_url=item_data.get('embed_url')
            )
            db.session.add(song)
            db.session.commit()
        
        # Lägg till i favoriter om den inte redan finns
        if song not in user.favorite_songs:
            user.favorite_songs.append(song)
            db.session.commit()
            
        return jsonify({"success": True, "message": "Låt tillagd som favorit"})
    
    elif item_type == 'album' and hasattr(user, 'favorite_albums'):
        # Sök efter albumet eller skapa det
        album = Album.query.filter_by(title=item_data.get('title'), artist=item_data.get('artist')).first()
        
        if not album:
            album = Album(
                title=item_data.get('title'),
                artist=item_data.get('artist'),
                cover_url=item_data.get('cover_url'),
                spotify_url=item_data.get('spotify_url')
            )
            db.session.add(album)
            db.session.commit()
        
        # Lägg till i favoriter om det inte redan finns
        if album not in user.favorite_albums:
            user.favorite_albums.append(album)
            db.session.commit()
            
        return jsonify({"success": True, "message": "Album tillagt som favorit"})
    
    elif item_type == 'artist' and hasattr(user, 'favorite_artists'):
        # Sök efter artisten eller skapa den
        artist = Artist.query.filter_by(name=item_data.get('name')).first()
        
        if not artist:
            artist = Artist(
                name=item_data.get('name'),
                cover_url=item_data.get('cover_url'),
                spotify_url=item_data.get('spotify_url')
            )
            db.session.add(artist)
            db.session.commit()
        
        # Lägg till i favoriter om den inte redan finns
        if artist not in user.favorite_artists:
            user.favorite_artists.append(artist)
            db.session.commit()
            
        return jsonify({"success": True, "message": "Artist tillagd som favorit"})
    
    return jsonify({"error": "Ogiltig typ eller funktionaliteten stöds inte"}), 400

@profile.route('/api/profile/remove-favorite', methods=['POST'])
@login_required
def remove_favorite():
    """Ta bort en låt, album eller artist från favoriter"""
    data = request.json
    item_type = data.get('type')  # 'song', 'album', eller 'artist'
    item_id = data.get('id')
    
    if not item_type or not item_id:
        return jsonify({"error": "Typ och ID krävs"}), 400
    
    user = current_user
    
    # Hantera de olika typerna
    if item_type == 'song' and hasattr(user, 'favorite_songs'):
        song = Song.query.get(item_id)
        if song and song in user.favorite_songs:
            user.favorite_songs.remove(song)
            db.session.commit()
            return jsonify({"success": True, "message": "Låt borttagen från favoriter"})
    
    elif item_type == 'album' and hasattr(user, 'favorite_albums'):
        album = Album.query.get(item_id)
        if album and album in user.favorite_albums:
            user.favorite_albums.remove(album)
            db.session.commit()
            return jsonify({"success": True, "message": "Album borttaget från favoriter"})
    
    elif item_type == 'artist' and hasattr(user, 'favorite_artists'):
        artist = Artist.query.get(item_id)
        if artist and artist in user.favorite_artists:
            user.favorite_artists.remove(artist)
            db.session.commit()
            return jsonify({"success": True, "message": "Artist borttagen från favoriter"})
    
    return jsonify({"error": "Objektet hittades inte"}, 404)

@profile.route('/follow/<username>', methods=['POST'])
@login_required
def follow_user(username):
    """Följ en annan användare"""
    user_to_follow = User.query.filter_by(username=username).first_or_404()
    
    if user_to_follow.id == current_user.id:
        flash('Du kan inte följa dig själv')
        return redirect(url_for('profile.view_profile', username=username))
    
    if hasattr(current_user, 'is_following') and current_user.is_following(user_to_follow):
        flash(f'Du följer redan {username}')
        return redirect(url_for('profile.view_profile', username=username))
    
    if hasattr(current_user, 'follow'):
        current_user.follow(user_to_follow)
        db.session.commit()
    
    flash(f'Du följer nu {username}')
    return redirect(url_for('profile.view_profile', username=username))

@profile.route('/unfollow/<username>', methods=['POST'])
@login_required
def unfollow_user(username):
    """Sluta följa en annan användare"""
    user_to_unfollow = User.query.filter_by(username=username).first_or_404()
    
    if not hasattr(current_user, 'is_following') or not current_user.is_following(user_to_unfollow):
        flash(f'Du följer inte {username}')
        return redirect(url_for('profile.view_profile', username=username))
    
    if hasattr(current_user, 'unfollow'):
        current_user.unfollow(user_to_unfollow)
        db.session.commit()
    
    flash(f'Du följer inte längre {username}')
    return redirect(url_for('profile.view_profile', username=username))

@profile.route('/api/follow/<username>', methods=['POST'])
@login_required
def follow_user_api(username):
    """API-rutt för att följa/avfölja användare"""
    user_to_follow = User.query.filter_by(username=username).first()
    
    if not user_to_follow:
        return jsonify({"error": "Användaren finns inte"}), 404
        
    if user_to_follow.id == current_user.id:
        return jsonify({"error": "Du kan inte följa dig själv"}), 400
    
    # Kontrollera att användaren har follow-funktionalitet
    if not hasattr(current_user, 'is_following') or not hasattr(current_user, 'follow') or not hasattr(current_user, 'unfollow'):
        return jsonify({"error": "Följfunktionalitet stöds inte"}), 500
    
    is_following = current_user.is_following(user_to_follow)
    
    if is_following:
        current_user.unfollow(user_to_follow)
        message = f"Du följer inte längre {username}"
        action = "unfollow"
    else:
        current_user.follow(user_to_follow)
        message = f"Du följer nu {username}"
        action = "follow"
        
    db.session.commit()
    
    followers_count = user_to_follow.followers.count() if hasattr(user_to_follow, 'followers') else 0
    
    return jsonify({
        "success": True,
        "message": message,
        "action": action,
        "followers_count": followers_count
    })