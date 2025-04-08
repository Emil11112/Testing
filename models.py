from flask_sqlalchemy import SQLAlchemy
from flask_login import UserMixin
from datetime import datetime
from werkzeug.security import generate_password_hash, check_password_hash
from sqlalchemy.sql import func

db = SQLAlchemy()

# Relationstabell för följare/följda
followers = db.Table('followers',
    db.Column('follower_id', db.Integer, db.ForeignKey('user.id')),
    db.Column('followed_id', db.Integer, db.ForeignKey('user.id'))
)

# Relationstabell för favoritlåtar
user_favorite_songs = db.Table('user_favorite_songs',
    db.Column('user_id', db.Integer, db.ForeignKey('user.id')),
    db.Column('song_id', db.Integer, db.ForeignKey('song.id'))
)

# Relationstabell för favoritalbum
user_favorite_albums = db.Table('user_favorite_albums',
    db.Column('user_id', db.Integer, db.ForeignKey('user.id')),
    db.Column('album_id', db.Integer, db.ForeignKey('album.id'))
)

# Relationstabell för favoritartister
user_favorite_artists = db.Table('user_favorite_artists',
    db.Column('user_id', db.Integer, db.ForeignKey('user.id')),
    db.Column('artist_id', db.Integer, db.ForeignKey('artist.id'))
)

class User(UserMixin, db.Model):
    """Användarmodell med inloggning och relationsinformation"""
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(128))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationer
    profile = db.relationship('Profile', backref='user', uselist=False, cascade="all, delete-orphan")
    posts = db.relationship('Post', backref='author', lazy='dynamic', cascade="all, delete-orphan")
    comments = db.relationship('Comment', backref='author', lazy='dynamic', cascade="all, delete-orphan")
    likes = db.relationship('Like', backref='user', lazy='dynamic', cascade="all, delete-orphan")
    
    # Relationer för musikdata
    favorite_songs = db.relationship('Song', secondary=user_favorite_songs, backref=db.backref('liked_by_users', lazy='dynamic'))
    favorite_albums = db.relationship('Album', secondary=user_favorite_albums, backref=db.backref('liked_by_users', lazy='dynamic'))
    favorite_artists = db.relationship('Artist', secondary=user_favorite_artists, backref=db.backref('liked_by_users', lazy='dynamic'))
    
    # Följare/följer-relation
    following = db.relationship(
        'User', secondary=followers,
        primaryjoin=(followers.c.follower_id == id),
        secondaryjoin=(followers.c.followed_id == id),
        backref=db.backref('followers', lazy='dynamic'),
        lazy='dynamic'
    )
    
    def set_password(self, password):
        self.password_hash = generate_password_hash(password)
    
    def check_password(self, password):
        return check_password_hash(self.password_hash, password)
    
    def follow(self, user):
        if not self.is_following(user):
            self.following.append(user)
    
    def unfollow(self, user):
        if self.is_following(user):
            self.following.remove(user)
    
    def is_following(self, user):
        return self.following.filter(followers.c.followed_id == user.id).count() > 0
    
    def __repr__(self):
        return f'<User {self.username}>'

class Profile(db.Model):
    """Profilinformation för användare"""
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    profile_picture = db.Column(db.String(120), default='default.jpg')
    bio = db.Column(db.Text, nullable=True)
    favorite_genre = db.Column(db.String(50), nullable=True)
    
    # Song of the day
    sotd_title = db.Column(db.String(128), nullable=True)
    sotd_artist = db.Column(db.String(128), nullable=True)
    song_picture = db.Column(db.String(128), nullable=True)
    
    def __repr__(self):
        return f'<Profile for User {self.user_id}>'

class Song(db.Model):
    """Låtdata från Spotify"""
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    artist = db.Column(db.String(200), nullable=False)
    album = db.Column(db.String(200), nullable=True)
    cover_url = db.Column(db.String(500), nullable=True)
    spotify_url = db.Column(db.String(500), nullable=True)
    embed_url = db.Column(db.String(500), nullable=True)
    
    # Relationer
    posts = db.relationship('Post', backref='song', lazy='dynamic')
    
    def __repr__(self):
        return f'<Song {self.title} by {self.artist}>'

class Album(db.Model):
    """Albumdata från Spotify"""
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    artist = db.Column(db.String(200), nullable=False)
    cover_url = db.Column(db.String(500), nullable=True)
    spotify_url = db.Column(db.String(500), nullable=False)
    
    # Relationer
    posts = db.relationship('Post', backref='album', lazy='dynamic')
    
    def __repr__(self):
        return f'<Album {self.title} by {self.artist}>'

class Artist(db.Model):
    """Artistdata från Spotify"""
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), nullable=False)
    cover_url = db.Column(db.String(500), nullable=True)
    spotify_url = db.Column(db.String(500), nullable=False)
    
    # Relationer
    posts = db.relationship('Post', backref='artist', lazy='dynamic')
    
    def __repr__(self):
        return f'<Artist {self.name}>'

class Post(db.Model):
    """Inläggsmodell för användares innehåll"""
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    content = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relaterad musikdata (bara en kan vara kopplad till ett inlägg)
    song_id = db.Column(db.Integer, db.ForeignKey('song.id'), nullable=True)
    album_id = db.Column(db.Integer, db.ForeignKey('album.id'), nullable=True)
    artist_id = db.Column(db.Integer, db.ForeignKey('artist.id'), nullable=True)
    
    # Relationer
    likes = db.relationship('Like', backref='post', lazy='dynamic', cascade="all, delete-orphan")
    comments = db.relationship('Comment', backref='post', lazy='dynamic', cascade="all, delete-orphan")
    
    def __repr__(self):
        return f'<Post {self.id} by User {self.user_id}>'

class Like(db.Model):
    """Gillamarkeringar på inlägg"""
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    post_id = db.Column(db.Integer, db.ForeignKey('post.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def __repr__(self):
        return f'<Like by User {self.user_id} on Post {self.post_id}>'

class Comment(db.Model):
    """Kommentarer på inlägg"""
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    post_id = db.Column(db.Integer, db.ForeignKey('post.id'), nullable=False)
    content = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def __repr__(self):
        return f'<Comment by User {self.user_id} on Post {self.post_id}>'