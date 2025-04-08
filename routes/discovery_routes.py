from flask import Blueprint, request, jsonify, render_template, redirect
from flask_login import login_required, current_user
from sqlalchemy import func, desc

from models import db, User, Profile, Post, Like, Comment, Song, Album, Artist

# Skapa en Blueprint
discovery = Blueprint('discovery', __name__)

@discovery.route('/discovery')
def discovery_page():
    """Visa discovery-sidan"""
    return render_template('discovery.html')

@discovery.route('/api/users/search')
def search_users():
    """Sök efter användare baserat på användarnamn"""
    query = request.args.get('q', '')
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 10, type=int)
    
    if not query:
        return jsonify({"error": "Sökterm krävs"}), 400
    
    # Sök efter användare vars användarnamn innehåller söktermen
    users = User.query.filter(User.username.ilike(f'%{query}%')).paginate(page=page, per_page=per_page)
    
    users_data = []
    for user in users.items:
        # Skippa den inloggade användaren i resultaten
        if current_user.is_authenticated and user.id == current_user.id:
            continue
            
        profile = Profile.query.filter_by(user_id=user.id).first()
        
        user_data = {
            "id": user.id,
            "username": user.username,
            "profile_picture": profile.profile_picture if profile else "default.jpg",
            "bio": profile.bio if profile and profile.bio else "",
            "favorite_genre": profile.favorite_genre if profile and profile.favorite_genre else ""
        }
        
        # Kolla om den inloggade användaren följer denna användare
        if current_user.is_authenticated:
            user_data["is_following"] = current_user.is_following(user)
            
        users_data.append(user_data)
    
    return jsonify({
        "users": users_data,
        "has_next": users.has_next,
        "has_prev": users.has_prev,
        "page": users.page,
        "total_pages": users.pages,
        "total_items": users.total
    })

@discovery.route('/api/users/suggested')
@login_required
def suggested_users():
    """Hämta föreslagna användare som den inloggade användaren kan vara intresserad av att följa"""
    # Användare med samma genrepreferenser
    current_profile = Profile.query.filter_by(user_id=current_user.id).first()
    favorite_genre = current_profile.favorite_genre if current_profile else None
    
    # Användare som följs av användare som den inloggade användaren följer
    following_users = [user.id for user in current_user.following]
    
    suggested = []
    
    # Om användaren har en favoritgenre, hitta andra med samma preferens
    if favorite_genre:
        genre_profiles = Profile.query.filter_by(favorite_genre=favorite_genre).limit(5).all()
        
        for profile in genre_profiles:
            user = User.query.get(profile.user_id)
            
            # Skippa den inloggade användaren och användare som redan följs
            if user.id == current_user.id or user.id in following_users:
                continue
                
            suggested.append({
                "id": user.id,
                "username": user.username,
                "profile_picture": profile.profile_picture or "default.jpg",
                "bio": profile.bio or "",
                "favorite_genre": profile.favorite_genre or "",
                "reason": "Liknande musiksmak"
            })
    
    # Om vi har färre än 5 förslag, lägg till populära användare
    if len(suggested) < 5:
        # Hitta populära användare (de med flest följare)
        popular_users = User.query.join(User.followers).group_by(User.id).order_by(db.func.count().desc()).limit(10).all()
        
        for user in popular_users:
            # Skippa användare som redan finns i förslagen
            if any(s["id"] == user.id for s in suggested):
                continue
                
            # Skippa den inloggade användaren och användare som redan följs
            if user.id == current_user.id or user.id in following_users:
                continue
                
            profile = Profile.query.filter_by(user_id=user.id).first()
            
            suggested.append({
                "id": user.id,
                "username": user.username,
                "profile_picture": profile.profile_picture if profile else "default.jpg",
                "bio": profile.bio if profile and profile.bio else "",
                "favorite_genre": profile.favorite_genre if profile and profile.favorite_genre else "",
                "reason": "Populär användare"
            })
            
            # Sluta när vi har 5 förslag
            if len(suggested) >= 5:
                break
    
    return jsonify({
        "suggested_users": suggested[:5]  # Returnera max 5 förslag
    })

@discovery.route('/api/trending')
def trending_music():
    """Hämta trendande musik baserat på användarnas inlägg och aktivitet"""
    # Hitta de mest populära låtarna (baserat på inlägg och gillningar)
    trending_songs = db.session.query(
        Song, func.count(Post.id).label('post_count'), func.count(Like.id).label('like_count')
    ).join(Post, Post.song_id == Song.id).join(Like, Like.post_id == Post.id, isouter=True).group_by(
        Song.id
    ).order_by(desc('post_count'), desc('like_count')).limit(5).all()
    
    songs_data = []
    for song, post_count, like_count in trending_songs:
        songs_data.append({
            "id": song.id,
            "title": song.title,
            "artist": song.artist,
            "cover_url": song.cover_url,
            "spotify_url": song.spotify_url,
            "embed_url": song.embed_url,
            "popularity_score": post_count + like_count
        })
    
    # Hitta de mest populära albumen
    trending_albums = db.session.query(
        Album, func.count(Post.id).label('post_count'), func.count(Like.id).label('like_count')
    ).join(Post, Post.album_id == Album.id).join(Like, Like.post_id == Post.id, isouter=True).group_by(
        Album.id
    ).order_by(desc('post_count'), desc('like_count')).limit(5).all()
    
    albums_data = []
    for album, post_count, like_count in trending_albums:
        albums_data.append({
            "id": album.id,
            "title": album.title,
            "artist": album.artist,
            "cover_url": album.cover_url,
            "spotify_url": album.spotify_url,
            "popularity_score": post_count + like_count
        })
    
    # Hitta de mest populära artisterna
    trending_artists = db.session.query(
        Artist, func.count(Post.id).label('post_count'), func.count(Like.id).label('like_count')
    ).join(Post, Post.artist_id == Artist.id).join(Like, Like.post_id == Post.id, isouter=True).group_by(
        Artist.id
    ).order_by(desc('post_count'), desc('like_count')).limit(5).all()
    
    artists_data = []
    for artist, post_count, like_count in trending_artists:
        artists_data.append({
            "id": artist.id,
            "name": artist.name,
            "cover_url": artist.cover_url,
            "spotify_url": artist.spotify_url,
            "popularity_score": post_count + like_count
        })
    
    return jsonify({
        "trending_songs": songs_data,
        "trending_albums": albums_data,
        "trending_artists": artists_data
    })

@discovery.route('/api/search/music')
def search_music():
    """Sök efter låtar, album eller artister via Spotify API"""
    query = request.args.get('q', '')
    search_type = request.args.get('type', 'track')  # track, album, eller artist
    
    if not query:
        return jsonify({"error": "Sökterm krävs"}), 400
    
    # Här skulle du använda SpotifyAPI för att söka, men vi skickar vidare till
    # profil-rutterna som redan har implementerat denna funktionalitet
    redirect_url = f"/api/profile/music-search?q={query}&type={search_type}"
    return redirect(redirect_url)