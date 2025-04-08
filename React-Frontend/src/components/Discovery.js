import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import './Discovery.css';

const Discovery = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [suggestedUsers, setSuggestedUsers] = useState([]);
  const [trendingMusic, setTrendingMusic] = useState({
    songs: [],
    albums: [],
    artists: []
  });
  const [loading, setLoading] = useState(false);
  const [suggestedLoading, setSuggestedLoading] = useState(true);
  const [trendingLoading, setTrendingLoading] = useState(true);

  // Ladda förslag när komponenten laddas
  useEffect(() => {
    fetchSuggestedUsers();
    fetchTrendingMusic();
  }, []);

  // Sök användare
  const handleSearch = async (e) => {
    e.preventDefault();
    
    if (!searchQuery.trim()) return;
    
    try {
      setLoading(true);
      const response = await axios.get(`/api/users/search?q=${encodeURIComponent(searchQuery)}`);
      setSearchResults(response.data.users || []);
      setLoading(false);
    } catch (error) {
      console.error('Error searching users:', error);
      setLoading(false);
    }
  };

  // Hämta föreslagna användare
  const fetchSuggestedUsers = async () => {
    try {
      setSuggestedLoading(true);
      const response = await axios.get('/api/users/suggested');
      setSuggestedUsers(response.data.suggested_users || []);
      setSuggestedLoading(false);
    } catch (error) {
      console.error('Error fetching suggested users:', error);
      setSuggestedLoading(false);
    }
  };

  // Hämta trendande musik
  const fetchTrendingMusic = async () => {
    try {
      setTrendingLoading(true);
      const response = await axios.get('/api/trending');
      setTrendingMusic({
        songs: response.data.trending_songs || [],
        albums: response.data.trending_albums || [],
        artists: response.data.trending_artists || []
      });
      setTrendingLoading(false);
    } catch (error) {
      console.error('Error fetching trending music:', error);
      setTrendingLoading(false);
    }
  };

  // Funktion för att följa/avfölja användare
  const handleFollowToggle = async (username, isFollowing) => {
    try {
      const response = await axios.post(`/api/follow/${username}`);
      
      if (response.data.success) {
        // Uppdatera följstatus i både sökresultat och förslag
        setSearchResults(prevResults => 
          prevResults.map(user => 
            user.username === username 
              ? { ...user, is_following: !isFollowing }
              : user
          )
        );
        
        setSuggestedUsers(prevSuggested => 
          prevSuggested.map(user => 
            user.username === username 
              ? { ...user, is_following: !isFollowing }
              : user
          )
        );
      }
    } catch (error) {
      console.error('Error toggling follow status:', error);
    }
  };

  return (
    <div className="discovery-container">
      <div className="discovery-left-column">
        {/* Sökdel */}
        <div className="search-section">
          <h2>Find People</h2>
          <form onSubmit={handleSearch} className="search-form">
            <input
              type="text"
              placeholder="Search for users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
            <button type="submit" className="search-button" disabled={loading}>
              {loading ? 'Searching...' : 'Search'}
            </button>
          </form>
          
          {/* Sökresultat */}
          {searchQuery && (
            <div className="search-results">
              <h3>Search Results</h3>
              
              {loading ? (
                <div className="loading">Searching...</div>
              ) : searchResults.length > 0 ? (
                <div className="user-list">
                  {searchResults.map(user => (
                    <div key={user.id} className="user-card">
                      <div className="user-card-content">
                        <img 
                          src={user.profile_picture || '/static/profile_pics/default.jpg'} 
                          alt={user.username} 
                          className="user-profile-pic" 
                        />
                        <div className="user-info">
                          <Link to={`/profile/${user.username}`} className="user-name">{user.username}</Link>
                          {user.favorite_genre && (
                            <span className="user-genre">{user.favorite_genre}</span>
                          )}
                          {user.bio && (
                            <p className="user-bio">{user.bio.substring(0, 60)}...</p>
                          )}
                        </div>
                      </div>
                      <button 
                        className={`follow-button ${user.is_following ? 'following' : ''}`}
                        onClick={() => handleFollowToggle(user.username, user.is_following)}
                      >
                        {user.is_following ? 'Following' : 'Follow'}
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="no-results">No users found for "{searchQuery}"</div>
              )}
            </div>
          )}
        </div>
        
        {/* Föreslagsna användare */}
        <div className="suggested-section">
          <h2>Suggested For You</h2>
          
          {suggestedLoading ? (
            <div className="loading">Loading suggestions...</div>
          ) : suggestedUsers.length > 0 ? (
            <div className="user-list">
              {suggestedUsers.map(user => (
                <div key={user.id} className="user-card">
                  <div className="user-card-content">
                    <img 
                      src={user.profile_picture || '/static/profile_pics/default.jpg'} 
                      alt={user.username} 
                      className="user-profile-pic" 
                    />
                    <div className="user-info">
                      <Link to={`/profile/${user.username}`} className="user-name">{user.username}</Link>
                      <span className="suggestion-reason">{user.reason}</span>
                      {user.favorite_genre && (
                        <span className="user-genre">{user.favorite_genre}</span>
                      )}
                    </div>
                  </div>
                  <button 
                    className={`follow-button ${user.is_following ? 'following' : ''}`}
                    onClick={() => handleFollowToggle(user.username, user.is_following)}
                  >
                    {user.is_following ? 'Following' : 'Follow'}
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="no-suggestions">
              No suggestions available. Follow some users to get better suggestions!
            </div>
          )}
        </div>
      </div>
      
      <div className="discovery-right-column">
        {/* Trendande musik */}
        <div className="trending-section">
          <h2>Trending Music</h2>
          
          {trendingLoading ? (
            <div className="loading">Loading trending content...</div>
          ) : (
            <>
              {/* Trendande låtar */}
              {trendingMusic.songs.length > 0 && (
                <div className="trending-category">
                  <h3>Top Songs</h3>
                  <div className="trending-list">
                    {trendingMusic.songs.map(song => (
                      <div key={song.id} className="trending-item">
                        <img 
                          src={song.cover_url || '/static/defaults/song.jpg'} 
                          alt={song.title} 
                          className="trending-cover" 
                        />
                        <div className="trending-info">
                          <div className="trending-title">{song.title}</div>
                          <div className="trending-artist">{song.artist}</div>
                        </div>
                        {song.embed_url && (
                          <div className="trending-player">
                            <iframe
                              src={song.embed_url}
                              width="100%"
                              height="80"
                              frameBorder="0"
                              allow="encrypted-media"
                              title={song.title}
                            ></iframe>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Trendande album */}
              {trendingMusic.albums.length > 0 && (
                <div className="trending-category">
                  <h3>Popular Albums</h3>
                  <div className="trending-grid">
                    {trendingMusic.albums.map(album => (
                      <a 
                        key={album.id} 
                        href={album.spotify_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="trending-card"
                      >
                        <img 
                          src={album.cover_url || '/static/defaults/album.jpg'} 
                          alt={album.title} 
                          className="trending-card-image" 
                        />
                        <div className="trending-card-info">
                          <div className="trending-card-title">{album.title}</div>
                          <div className="trending-card-subtitle">{album.artist}</div>
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Trendande artister */}
              {trendingMusic.artists.length > 0 && (
                <div className="trending-category">
                  <h3>Top Artists</h3>
                  <div className="trending-grid">
                    {trendingMusic.artists.map(artist => (
                      <a 
                        key={artist.id} 
                        href={artist.spotify_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="trending-card"
                      >
                        <img 
                          src={artist.cover_url || '/static/defaults/artist.jpg'} 
                          alt={artist.name} 
                          className="trending-card-image artist-image" 
                        />
                        <div className="trending-card-info">
                          <div className="trending-card-title">{artist.name}</div>
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              )}
              
              {!trendingMusic.songs.length && !trendingMusic.albums.length && !trendingMusic.artists.length && (
                <div className="no-trending">
                  No trending content available. Start posting and interacting to see trends!
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Discovery;