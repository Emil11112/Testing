# __init__.py (i huvudkatalogen)
from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager
from flask_cors import CORS  # Add this import
import os

# Initiera delade extensions
db = SQLAlchemy()
login_manager = LoginManager()

def create_app():
    app = Flask(__name__)
    
    # Konfigurera CORS
    CORS(app, resources={
        r"/*": {
            "origins": [
                "http://localhost:3000",  # React development server
                "http://127.0.0.1:3000"
            ],
            "supports_credentials": True
        }
    })
    
    # Konfiguration
    app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', os.urandom(24))
    app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DATABASE_URL', 'sqlite:///resonate.db')
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    
    # Initiera databas
    db.init_app(app)
    
    # Initiera login_manager
    login_manager.init_app(app)
    login_manager.login_view = 'auth.login'
    
    # Importera blueprints
    from routes.auth_routes import auth
    from routes.profile_routes import profile
    from routes.post_routes import posts
    from routes.discovery_routes import discovery
    from routes.main_routes import main
    
    # Registrera blueprints
    app.register_blueprint(auth)
    app.register_blueprint(profile)
    app.register_blueprint(posts)
    app.register_blueprint(discovery)
    app.register_blueprint(main)
    
    # Importera modeller
    from models import User
    
    @login_manager.user_loader
    def load_user(user_id):
        return User.query.get(int(user_id))
    
    # Skapa databastabeller
    with app.app_context():
        db.create_all()
    
    return app