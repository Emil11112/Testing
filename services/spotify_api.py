import os
import base64
import requests
import json
from dotenv import load_dotenv

load_dotenv()

class SpotifyAPI:
    """Huvudklass för Spotify API-integration"""
    def __init__(self):
        self.__client_id = os.getenv("CLIENT_ID")
        self.__client_secret = os.getenv("CLIENT_SECRET")
        self.__token = self.get_token()

    def get_token(self):
        """Hämtar en access token från Spotify API"""
        auth_string = f"{self.__client_id}:{self.__client_secret}"
        auth_bytes = auth_string.encode("utf-8")
        auth_base64 = str(base64.b64encode(auth_bytes), "utf-8")

        url = "https://accounts.spotify.com/api/token"
        headers = {
            "Authorization": "Basic " + auth_base64,
            "Content-Type": "application/x-www-form-urlencoded"
        }
        data = {"grant_type": "client_credentials"}
        
        response = requests.post(url, headers=headers, data=data)
        json_result = json.loads(response.content)
        token = json_result.get("access_token")

        return token

    def get_auth_header(self):
        """Returnerar auth header för API-anrop"""
        return {"Authorization": f"Bearer {self.__token}"}

    def search(self, query, search_type="track", limit=1):
        """Generisk sökfunktion för Spotify API"""
        url = "https://api.spotify.com/v1/search"
        headers = self.get_auth_header()
        params = {
            "q": query,
            "type": search_type,
            "limit": limit
        }
        
        response = requests.get(url, headers=headers, params=params)
        
        if response.status_code != 200:
            print(f"Error: {response.status_code}")
            print(response.text)
            return None
            
        items_key = f"{search_type}s"
        result = response.json().get(items_key, {}).get("items", [])
        
        return result[0] if result else None


class SpotifySearch:
    """Sökklass för att hämta data från Spotify"""
    def __init__(self, query):
        self.spotify = SpotifyAPI()
        self.query = query

    def get_track(self):
        """Hämtar låtinformation"""
        track_data = self.spotify.search(self.query, "track")
        
        if not track_data:
            return None

        # Sammanställ låtinformation
        track_info = {
            "name": track_data["name"],
            "artist": ", ".join(artist["name"] for artist in track_data["artists"]),
            "album": track_data["album"]["name"],
            "cover_url": track_data["album"]["images"][0]["url"] if track_data["album"]["images"] else None,
            "spotify_url": track_data["external_urls"]["spotify"],
            "embed_link": f"https://open.spotify.com/embed/track/{track_data['id']}"
        }
        
        return track_info

    def get_album(self):
        """Hämtar albuminformation"""
        album_data = self.spotify.search(self.query, "album")
        
        if not album_data:
            return None

        # Sammanställ albuminformation
        album_info = {
            "title": album_data["name"],
            "artist": ", ".join(artist["name"] for artist in album_data["artists"]),
            "release_date": album_data.get("release_date"),
            "cover_url": album_data["images"][0]["url"] if album_data["images"] else None,
            "spotify_url": album_data["external_urls"]["spotify"]
        }
        
        return album_info

    def get_artist(self):
        """Hämtar artistinformation"""
        artist_data = self.spotify.search(self.query, "artist")
        
        if not artist_data:
            return None

        # Sammanställ artistinformation
        artist_info = {
            "name": artist_data["name"],
            "genres": artist_data.get("genres", []),
            "cover_url": artist_data["images"][0]["url"] if artist_data["images"] else None,
            "spotify_url": artist_data["external_urls"]["spotify"]
        }
        
        return artist_info