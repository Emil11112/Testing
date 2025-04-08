# routes/__init__.py

# Bara för att markera katalogen som en Python-modul
# (tom fil funkar också)

# Alternativt kan du importera och exponera dina route-moduler
from .auth_routes import auth
from .profile_routes import profile
from .post_routes import posts
from .discovery_routes import discovery
from .main_routes import main

__all__ = ['auth', 'profile', 'posts', 'discovery', 'main']