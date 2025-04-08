import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './EditProfile.css';

const EditProfile = ({ user, setUser }) => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    bio: '',
    favorite_genre: '',
    sotd_title: '',
    sotd_artist: ''
  });
  const [profilePicture, setProfilePicture] = useState(null);
  const [songPicture, setSongPicture] = useState(null);
  const [favoriteSongs, setFavoriteSongs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [previewUrl, setPreviewUrl] = useState('');
  const [songPreviewUrl, setSongPreviewUrl] = useState('');
  
  // Musiksökvariabler
  const [songSearchQuery, setSongSearchQuery] = useState('');
  const [songSearchResults, setSongSearchResults] = useState([]);
  const [searchingForSong, setSearchingForSong] = useState(false);
  const [selectedSongIndex, setSelectedSongIndex] = useState(null);

  // Ladda användardata när komponenten laddas
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`/api/profile/${user.username}`);
        const userData = response.data;
        
        setFormData({
          email: userData.email || '',
          bio: userData.bio || '',
          favorite_genre: userData.favorite_genre || '',
          sotd_title: userData.song_of_the_day?.title || '',
          sotd_artist: userData.song_of_the_day?.artist || ''
        });
        
        setFavoriteSongs(userData.favorite_songs || []);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching user data:', error);
        setError('Failed to load user profile data');
        setLoading(false);
      }
    };
    
    if (user) {
      fetchUserData();
    }
  }, [user]);

  // Hantera ändringar i formulärfält
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Hantera profilbildsuppladdning
  const handleProfilePictureChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB max
        setError('Profile picture must be less than 5MB');
        return;
      }
      
      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
      if (!allowedTypes.includes(file.type)) {
        setError('Only JPEG, PNG, and GIF images are allowed');
        return;
      }
      
      setProfilePicture(file);
      
      // Skapa URL för förhandsgranskning
      const objectUrl = URL.createObjectURL(file);
      setPreviewUrl(objectUrl);
      
      // Rensa URL när komponenten avmonteras
      return () => URL.revokeObjectURL(objectUrl);
    }
  };

  // Hantera Song of the day-bilduppladdning
  const handleSongPictureChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB max
        setError('Song picture must be less than 5MB');
        return;
      }
      
      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
      if (!allowedTypes.includes(file.type)) {
        setError('Only JPEG, PNG, and GIF images are allowed');
        return;
      }
      
      setSongPicture(file);
      
      // Skapa URL för förhandsgranskning
      const objectUrl = URL.createObjectURL(file);
      setSongPreviewUrl(objectUrl);
      
      // Rensa URL när komponenten avmonteras
      return () => URL.revokeObjectURL(objectUrl);
    }
  };

  // Sök efter låtar via Spotify API
  const searchSongs = async () => {
    if (!songSearchQuery.trim()) return;
    
    try {
      setSearchingForSong(true);
      const response = await axios.get(`/api/search/music?q=${encodeURIComponent(songSearchQuery)}&type=track`);
      
      if (response.data) {
        // Om vi bara får en låt, lägg den i en array
        const results = Array.isArray(response.data) ? response.data : [response.data];
        setSongSearchResults(results);
      } else {
        setSongSearchResults([]);
      }
      
      setSearchingForSong(false);
    } catch (error) {
      console.error('Error searching for songs:', error);
      setSearchingForSong(false);
    }
  };

  // Lägg till låt i favoriter
  const addSongToFavorites = (song) => {
    // Kolla att vi inte redan har max antal låtar
    if (favoriteSongs.length >= 5) {
      setError('You can only have up to 5 favorite songs');
      return;
    }
    
    // Kolla att låten inte redan finns i favoriterna
    const songExists = favoriteSongs.some(s => 
      s.title === song.title && s.artist === song.artist
    );
    
    if (songExists) {
      setError('This song is already in your favorites');
      return;
    }
    
    setFavoriteSongs(prev => [...prev, song]);
    setSongSearchQuery('');
    setSongSearchResults([]);
  };

  // Ta bort låt från favoriter
  const removeSongFromFavorites = (index) => {
    setFavoriteSongs(prev => prev.filter((_, i) => i !== index));
  };

  // Spara profiländringar
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setSaving(true);
      setError('');
      
      // Skapa en FormData-instans för att skicka data inklusive bildfiler
      const formDataToSend = new FormData();
      
      // Lägg till textfälten
      Object.keys(formData).forEach(key => {
        formDataToSend.append(key, formData[key]);
      });
      
      // Lägg till favoritlåtarna som JSON
      formDataToSend.append('favorite_songs', JSON.stringify(favoriteSongs));
      
      // Lägg till bilder om de finns
      if (profilePicture) {
        formDataToSend.append('profile_picture', profilePicture);
      }
      
      if (songPicture) {
        formDataToSend.append('song_picture', songPicture);
      }
      
      // Skicka data till servern
      await axios.post('/edit-profile', formDataToSend, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      // Uppdatera användaren i förälder-komponenten om e-posten har ändrats
      if (formData.email !== user.email) {
        setUser({
          ...user,
          email: formData.email
        });
      }
      
      // Navigera till profilsidan
      navigate(`/profile/${user.username}`);
    } catch (error) {
      console.error('Error saving profile changes:', error);
      setError(error.response?.data?.error || 'Failed to save profile changes');
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="loading">Loading profile data...</div>;
  }

  return (
    <div className="edit-profile-container">
      <h1>Edit Your Profile</h1>
      
      {error && <div className="error">{error}</div>}
      
      <form onSubmit={handleSubmit}>
        <div className="edit-profile-grid">
          <div className="edit-profile-left">
            <div className="form-section">
              <h2>Basic Information</h2>
              
              <div className="form-group">
                <label htmlFor="email">Email</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="bio">Bio</label>
                <textarea
                  id="bio"
                  name="bio"
                  value={formData.bio}
                  onChange={handleChange}
                  placeholder="Tell other users about yourself..."
                  maxLength={300}
                />
                <small>{(formData.bio || '').length}/300 characters</small>
              </div>
              
              <div className="form-group">
                <label htmlFor="favorite_genre">Favorite Genre</label>
                <select
                  id="favorite_genre"
                  name="favorite_genre"
                  value={formData.favorite_genre}
                  onChange={handleChange}
                >
                  <option value="">Select a genre</option>
                  <option value="Rock">Rock</option>
                  <option value="Pop">Pop</option>
                  <option value="Hip Hop">Hip Hop</option>
                  <option value="Electronic">Electronic</option>
                  <option value="Jazz">Jazz</option>
                  <option value="Classical">Classical</option>
                  <option value="Country">Country</option>
                  <option value="R&B">R&B</option>
                  <option value="Metal">Metal</option>
                  <option value="Indie">Indie</option>
                  <option value="Folk">Folk</option>
                  <option value="Blues">Blues</option>
                </select>
              </div>
            </div>
            
            <div className="form-section">
              <h2>Profile Picture</h2>
              
              <div className="profile-picture-container">
                <img 
                  src={previewUrl || `/static/profile_pics/${user.profile_picture || 'default.jpg'}`} 
                  alt="Profile Preview" 
                  className="profile-picture-preview" 
                />
                
                <div className="form-group">
                  <label htmlFor="profile_picture">Upload New Picture</label>
                  <input
                    type="file"
                    id="profile_picture"
                    onChange={handleProfilePictureChange}
                    accept="image/jpeg, image/png, image/gif"
                  />
                  <small>Max size: 5MB. Formats: JPEG, PNG, GIF</small>
                </div>
              </div>
            </div>
          </div>
          
          <div className="edit-profile-right">
            <div className="form-section">
              <h2>Song of the Day</h2>
              
              <div className="sotd-container">
                <div className="sotd-picture-container">
                  <img 
                    src={songPreviewUrl || `/static/song_pics/${user.song_picture || 'default.jpg'}`} 
                    alt="Song Preview" 
                    className="sotd-picture-preview" 
                  />
                  
                  <div className="form-group">
                    <label htmlFor="song_picture">Song Picture</label>
                    <input
                      type="file"
                      id="song_picture"
                      onChange={handleSongPictureChange}
                      accept="image/jpeg, image/png, image/gif"
                    />
                  </div>
                </div>
                
                <div className="sotd-info">
                  <div className="form-group">
                    <label htmlFor="sotd_title">Song Title</label>
                    <input
                      type="text"
                      id="sotd_title"
                      name="sotd_title"
                      value={formData.sotd_title}
                      onChange={handleChange}
                      placeholder="Enter song title"
                    />
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="sotd_artist">Artist</label>
                    <input
                      type="text"
                      id="sotd_artist"
                      name="sotd_artist"
                      value={formData.sotd_artist}
                      onChange={handleChange}
                      placeholder="Enter artist name"
                    />
                  </div>
                </div>
              </div>
            </div>
            
            <div className="form-section">
              <h2>Favorite Songs</h2>
              
              <div className="favorite-songs-container">
                <div className="favorite-songs-list">
                  {favoriteSongs.length > 0 ? (
                    favoriteSongs.map((song, index) => (
                      <div key={index} className="favorite-song-item">
                        <div className="song-info">
                          <img 
                            src={song.cover_url || '/static/defaults/song.jpg'} 
                            alt={song.title} 
                            className="song-thumbnail" 
                          />
                          <div>
                            <div className="song-title">{song.title}</div>
                            <div className="song-artist">{song.artist}</div>
                          </div>
                        </div>
                        <button 
                          type="button" 
                          className="remove-song-button"
                          onClick={() => removeSongFromFavorites(index)}
                        >
                          ✕
                        </button>
                      </div>
                    ))
                  ) : (
                    <div className="no-songs">No favorite songs added yet</div>
                  )}
                </div>
                
                <div className="add-song-container">
                  <div className="search-container">
                    <div className="search-input-wrapper">
                      <input
                        type="text"
                        placeholder="Search for songs to add..."
                        value={songSearchQuery}
                        onChange={(e) => setSongSearchQuery(e.target.value)}
                        className="song-search-input"
                      />
                      <button 
                        type="button" 
                        className="search-song-button"
                        onClick={searchSongs}
                        disabled={searchingForSong || !songSearchQuery.trim()}
                      >
                        {searchingForSong ? 'Searching...' : 'Search'}
                      </button>
                    </div>
                    
                    {songSearchResults.length > 0 && (
                      <div className="search-results">
                        {songSearchResults.map((song, index) => (
                          <div 
                            key={index} 
                            className="search-result-item"
                            onClick={() => addSongToFavorites(song)}
                          >
                            <img 
                              src={song.cover_url || '/static/defaults/song.jpg'} 
                              alt={song.title} 
                              className="result-thumbnail" 
                            />
                            <div className="result-info">
                              <div className="result-title">{song.title}</div>
                              <div className="result-artist">{song.artist}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  <small className="help-text">
                    You can add up to 5 favorite songs to showcase on your profile.
                  </small>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="form-actions">
          <button 
            type="button" 
            className="cancel-button"
            onClick={() => navigate(`/profile/${user.username}`)}
          >
            Cancel
          </button>
          <button 
            type="submit" 
            className="save-button"
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default EditProfile;