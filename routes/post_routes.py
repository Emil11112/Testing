from flask import Blueprint, request, jsonify, render_template, redirect, url_for, flash
from flask_login import login_required, current_user
from datetime import datetime
import json

from models import db, User, Post, Like, Comment, Song, Album, Artist

# Skapa en Blueprint
posts = Blueprint('posts', __name__)

@posts.route('/api/posts')
def get_posts():
    """Hämta inlägg för hemflödet"""
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 10, type=int)
    
    # För inloggade användare, visa inlägg från användaren och användare som användaren följer
    following_ids = []
    if current_user.is_authenticated:
        following_ids = [user.id for user in current_user.following]
        following_ids.append(current_user.id)  # Inkludera egna inlägg
        feed_posts = Post.query.filter(Post.user_id.in_(following_ids))
    else:
        # För icke-inloggade användare, visa de senaste inläggen
        feed_posts = Post.query
    
    # Sortera efter datum (nyast först) och paginera
    paginated_posts = feed_posts.order_by(Post.created_at.desc()).paginate(page=page, per_page=per_page)
    
    posts_data = []
    for post in paginated_posts.items:
        user = User.query.get(post.user_id)
        
        # Grundläggande inläggsdata
        post_data = {
            "id": post.id,
            "content": post.content,
            "created_at": post.created_at.strftime("%Y-%m-%d %H:%M:%S"),
            "user": {
                "id": user.id,
                "username": user.username,
                "profile_picture": user.profile.profile_picture if user.profile else "default.jpg"
            },
            "likes_count": post.likes.count(),
            "comments_count": post.comments.count(),
            "liked_by_user": False
        }
        
        # Kolla om inloggad användare har gillat inlägget
        if current_user.is_authenticated:
            post_data["liked_by_user"] = post.likes.filter_by(user_id=current_user.id).first() is not None
        
        # Lägg till relaterad musikdata om det finns
        if post.song_id:
            song = Song.query.get(post.song_id)
            if song:
                post_data["song"] = {
                    "id": song.id,
                    "title": song.title,
                    "artist": song.artist,
                    "cover_url": song.cover_url,
                    "spotify_url": song.spotify_url,
                    "embed_url": song.embed_url
                }
                
        if post.album_id:
            album = Album.query.get(post.album_id)
            if album:
                post_data["album"] = {
                    "id": album.id,
                    "title": album.title,
                    "artist": album.artist,
                    "cover_url": album.cover_url,
                    "spotify_url": album.spotify_url
                }
                
        if post.artist_id:
            artist = Artist.query.get(post.artist_id)
            if artist:
                post_data["artist"] = {
                    "id": artist.id,
                    "name": artist.name,
                    "cover_url": artist.cover_url,
                    "spotify_url": artist.spotify_url
                }
                
        posts_data.append(post_data)
    
    return jsonify({
        "posts": posts_data,
        "has_next": paginated_posts.has_next,
        "has_prev": paginated_posts.has_prev,
        "page": paginated_posts.page,
        "total_pages": paginated_posts.pages,
        "total_items": paginated_posts.total
    })

@posts.route('/api/posts/<int:post_id>')
def get_post(post_id):
    """Hämta ett specifikt inlägg"""
    post = Post.query.get_or_404(post_id)
    user = User.query.get(post.user_id)
    
    # Skapa svarsdata
    post_data = {
        "id": post.id,
        "content": post.content,
        "created_at": post.created_at.strftime("%Y-%m-%d %H:%M:%S"),
        "user": {
            "id": user.id,
            "username": user.username,
            "profile_picture": user.profile.profile_picture if user.profile else "default.jpg"
        },
        "likes_count": post.likes.count(),
        "comments_count": post.comments.count(),
        "liked_by_user": False
    }
    
    # Kolla om inloggad användare har gillat inlägget
    if current_user.is_authenticated:
        post_data["liked_by_user"] = post.likes.filter_by(user_id=current_user.id).first() is not None
    
    # Lägg till relaterad musikdata om det finns
    if post.song_id:
        song = Song.query.get(post.song_id)
        if song:
            post_data["song"] = {
                "id": song.id,
                "title": song.title,
                "artist": song.artist,
                "cover_url": song.cover_url,
                "spotify_url": song.spotify_url,
                "embed_url": song.embed_url
            }
            
    if post.album_id:
        album = Album.query.get(post.album_id)
        if album:
            post_data["album"] = {
                "id": album.id,
                "title": album.title,
                "artist": album.artist,
                "cover_url": album.cover_url,
                "spotify_url": album.spotify_url
            }
            
    if post.artist_id:
        artist = Artist.query.get(post.artist_id)
        if artist:
            post_data["artist"] = {
                "id": artist.id,
                "name": artist.name,
                "cover_url": artist.cover_url,
                "spotify_url": artist.spotify_url
            }
    
    return jsonify(post_data)

@posts.route('/api/posts', methods=['POST'])
@login_required
def create_post():
    """Skapa ett nytt inlägg"""
    data = request.json
    content = data.get('content')
    
    if not content or not content.strip():
        return jsonify({"error": "Inläggsinnehåll kan inte vara tomt"}), 400
    
    # Skapa nytt inlägg
    new_post = Post(
        user_id=current_user.id,
        content=content,
        created_at=datetime.utcnow()
    )
    
    # Lägg till relaterat musikinnehåll om det finns
    song_id = data.get('song_id')
    album_id = data.get('album_id')
    artist_id = data.get('artist_id')
    
    # Validera att bara en typ av musikinnehåll läggs till
    music_items = [song_id, album_id, artist_id]
    music_items_count = sum(1 for item in music_items if item)
    
    if music_items_count > 1:
        return jsonify({"error": "Ett inlägg kan bara ha en typ av musikinnehåll"}), 400
    
    if song_id:
        new_post.song_id = song_id
    elif album_id:
        new_post.album_id = album_id
    elif artist_id:
        new_post.artist_id = artist_id
    
    db.session.add(new_post)
    db.session.commit()
    
    return jsonify({
        "success": True,
        "message": "Inlägget har skapats",
        "post_id": new_post.id
    }), 201

@posts.route('/api/posts/<int:post_id>', methods=['PUT'])
@login_required
def update_post(post_id):
    """Uppdatera ett inlägg"""
    post = Post.query.get_or_404(post_id)
    
    # Kolla att det är användarens egna inlägg
    if post.user_id != current_user.id:
        return jsonify({"error": "Du kan bara redigera dina egna inlägg"}), 403
    
    data = request.json
    content = data.get('content')
    
    if not content or not content.strip():
        return jsonify({"error": "Inläggsinnehåll kan inte vara tomt"}), 400
    
    post.content = content
    db.session.commit()
    
    return jsonify({
        "success": True,
        "message": "Inlägget har uppdaterats"
    })

@posts.route('/api/posts/<int:post_id>', methods=['DELETE'])
@login_required
def delete_post(post_id):
    """Ta bort ett inlägg"""
    post = Post.query.get_or_404(post_id)
    
    # Kolla att det är användarens egna inlägg
    if post.user_id != current_user.id:
        return jsonify({"error": "Du kan bara ta bort dina egna inlägg"}), 403
    
    db.session.delete(post)
    db.session.commit()
    
    return jsonify({
        "success": True,
        "message": "Inlägget har tagits bort"
    })

@posts.route('/api/posts/<int:post_id>/like', methods=['POST'])
@login_required
def like_post(post_id):
    """Gilla/ogilla ett inlägg"""
    post = Post.query.get_or_404(post_id)
    
    # Kolla om användaren redan gillat inlägget
    existing_like = Like.query.filter_by(user_id=current_user.id, post_id=post_id).first()
    
    if existing_like:
        # Ta bort gillamarkeringen om den redan finns
        db.session.delete(existing_like)
        action = "unliked"
    else:
        # Lägg till en gillamarkering
        new_like = Like(
            user_id=current_user.id,
            post_id=post_id,
            created_at=datetime.utcnow()
        )
        db.session.add(new_like)
        action = "liked"
    
    db.session.commit()
    
    return jsonify({
        "success": True,
        "action": action,
        "likes_count": post.likes.count()
    })

@posts.route('/api/posts/<int:post_id>/comments')
def get_comments(post_id):
    """Hämta kommentarer för ett inlägg"""
    post = Post.query.get_or_404(post_id)
    
    # Hämta kommentarer sorterade efter datum
    comments = post.comments.order_by(Comment.created_at).all()
    
    comments_data = []
    for comment in comments:
        user = User.query.get(comment.user_id)
        
        comments_data.append({
            "id": comment.id,
            "content": comment.content,
            "created_at": comment.created_at.strftime("%Y-%m-%d %H:%M:%S"),
            "user": {
                "id": user.id,
                "username": user.username,
                "profile_picture": user.profile.profile_picture if user.profile else "default.jpg"
            }
        })
    
    return jsonify({
        "post_id": post_id,
        "comments": comments_data,
        "comments_count": len(comments_data)
    })

@posts.route('/api/posts/<int:post_id>/comments', methods=['POST'])
@login_required
def create_comment(post_id):
    """Skapa en ny kommentar på ett inlägg"""
    post = Post.query.get_or_404(post_id)
    data = request.json
    content = data.get('content')
    
    if not content or not content.strip():
        return jsonify({"error": "Kommentarsinnehåll kan inte vara tomt"}), 400
    
    # Skapa ny kommentar
    new_comment = Comment(
        user_id=current_user.id,
        post_id=post_id,
        content=content,
        created_at=datetime.utcnow()
    )
    
    db.session.add(new_comment)
    db.session.commit()
    
    # Hämta användardata för svaret
    user = current_user
    
    return jsonify({
        "success": True,
        "message": "Kommentaren har skapats",
        "comment": {
            "id": new_comment.id,
            "content": new_comment.content,
            "created_at": new_comment.created_at.strftime("%Y-%m-%d %H:%M:%S"),
            "user": {
                "id": user.id,
                "username": user.username,
                "profile_picture": user.profile.profile_picture if user.profile else "default.jpg"
            }
        }
    }), 201

@posts.route('/api/comments/<int:comment_id>', methods=['DELETE'])
@login_required
def delete_comment(comment_id):
    """Ta bort en kommentar"""
    comment = Comment.query.get_or_404(comment_id)
    
    # Kolla att det är användarens egna kommentar
    if comment.user_id != current_user.id:
        return jsonify({"error": "Du kan bara ta bort dina egna kommentarer"}), 403
    
    post_id = comment.post_id
    
    db.session.delete(comment)
    db.session.commit()
    
    return jsonify({
        "success": True,
        "message": "Kommentaren har tagits bort",
        "post_id": post_id
    })

@posts.route('/user/<username>/posts')
def get_user_posts(username):
    """Hämta en användares inlägg"""
    user = User.query.filter_by(username=username).first_or_404()
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 10, type=int)
    
    # Hämta användarens inlägg
    user_posts = Post.query.filter_by(user_id=user.id).order_by(Post.created_at.desc()).paginate(page=page, per_page=per_page)
    
    posts_data = []
    for post in user_posts.items:
        # Grundläggande inläggsdata
        post_data = {
            "id": post.id,
            "content": post.content,
            "created_at": post.created_at.strftime("%Y-%m-%d %H:%M:%S"),
            "user": {
                "id": user.id,
                "username": user.username,
                "profile_picture": user.profile.profile_picture if user.profile else "default.jpg"
            },
            "likes_count": post.likes.count(),
            "comments_count": post.comments.count(),
            "liked_by_user": False
        }
        
        # Kolla om inloggad användare har gillat inlägget
        if current_user.is_authenticated:
            post_data["liked_by_user"] = post.likes.filter_by(user_id=current_user.id).first() is not None
        
        # Lägg till relaterad musikdata om det finns
        if post.song_id:
            song = Song.query.get(post.song_id)
            if song:
                post_data["song"] = {
                    "id": song.id,
                    "title": song.title,
                    "artist": song.artist,
                    "cover_url": song.cover_url,
                    "spotify_url": song.spotify_url,
                    "embed_url": song.embed_url
                }
                
        if post.album_id:
            album = Album.query.get(post.album_id)
            if album:
                post_data["album"] = {
                    "id": album.id,
                    "title": album.title,
                    "artist": album.artist,
                    "cover_url": album.cover_url,
                    "spotify_url": album.spotify_url
                }
                
        if post.artist_id:
            artist = Artist.query.get(post.artist_id)
            if artist:
                post_data["artist"] = {
                    "id": artist.id,
                    "name": artist.name,
                    "cover_url": artist.cover_url,
                    "spotify_url": artist.spotify_url
                }
                
        posts_data.append(post_data)
    
    return jsonify({
        "username": user.username,
        "posts": posts_data,
        "has_next": user_posts.has_next,
        "has_prev": user_posts.has_prev,
        "page": user_posts.page,
        "total_pages": user_posts.pages,
        "total_items": user_posts.total
    })