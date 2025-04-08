import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import './Profile.css';

const Profile = () => {
  const { username } = useParams();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isCurrentUser, setIsCurrentUser] = useState(false);
  const [posts, setPosts] = useState([]);
  const [postsLoading, setPostsLoading] = useState(false);
  
  // Hämta användardata baserat på användarnamn i URL:en
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        
        // Hämta profildata från API
        const response = await axios.get(`/api/profile/${username}`);
        setProfile(response.data);
        setIsFollowing(response.data.is_following);
        
        // Kontrollera om det är användarens egna profil
        const authResponse = await axios.get('/auth-status');
        if (authResponse.data.logged_in) {
          setIsCurrentUser(authResponse.data.user.username === username);
        }
        
        setLoading(false);
      } catch (error) {
        console.error('Error fetching profile:', error);
        setError('Failed to load profile data');
        setLoading(false);
      }
    };
    
    fetchProfile();
  }, [username]);
  
  // Hämta användarens inlägg
  useEffect(() => {
    const fetchPosts = async () => {
      if (!profile) return;
      
      try {
        setPostsLoading(true);
        const response = await axios.get(`/user/${username}/posts`);
        setPosts(response.data.posts || []);
        setPostsLoading(false);
      } catch (error) {
        console.error('Error fetching user posts:', error);
        setPostsLoading(false);
      }
    };
    
    fetchPosts();
  }, [profile, username]);
  
  // Hantera följning/avföljning av användare
  const handleFollowToggle = async () => {
    try {
      const response = await axios.post(`/api/follow/${username}`);
      
      if (response.data.success) {
        setIsFollowing(response.data.action === 'follow');
        
        // Uppdatera följareantalet i profilen
        setProfile(prevProfile => ({
          ...prevProfile,
          followers_count: isFollowing 
            ? prevProfile.followers_count - 1 
            : prevProfile.followers_count + 1
        }));
      }
    } catch (error) {
      console.error('Error toggling follow status:', error);
    }
  };
  
  if (loading) {
    return <div className="loading">Loading profile...</div>;
  }
  
  if (error) {
    return <div className="error">{error}</div>;
  }
  
  if (!profile) {
    return <div className="not-found">Profile not found</div>;
  }
  
  return (
    <div className="profile-page">
      <div className="left-column">
        <div className="profile-group">
          <div className="profile-container">
            <div className="profile-header">
              <img
                src={profile.profile_picture || '/static/profile_pics/default.jpg'}
                alt={`${profile.username}'s profile`}
                className="profile-pic-large"
              />
              <div className="profile-info">
                <h1 className="profile-username">{profile.username}</h1>
                {profile.favorite_genre && (
                  <div className="favorite-genres">
                    <span className="genre">{profile.favorite_genre}</span>
                  </div>
                )}
                <div className="profile-stats">
                  <span>{profile.followers_count || 0} Followers</span>
                  <span>{profile.following_count || 0} Following</span>
                </div>
                
                {profile.bio && <p className="profile-bio">{profile.bio}</p>}
                
                {isCurrentUser ? (
                  <Link to="/edit-profile" className="profile-edit-button">
                    Edit Profile
                  </Link>
                ) : (
                  <button 
                    className={`profile-follow-button ${isFollowing ? 'following' : ''}`}
                    onClick={handleFollowToggle}
                  >
                    {isFollowing ? 'Unfollow' : 'Follow'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right column for posts */}
      <div className="feed">
        <h2>Posts</h2>
        
        {/* Endast för användaren själv visa skapa inlägg-form */}
        {isCurrentUser && (
          <div className="create-post">
            <Link to="/create-post" className="create-post-button">
              Create New Post
            </Link>
          </div>
        )}
        
        {postsLoading ? (
          <div className="loading">Loading posts...</div>
        ) : posts.length > 0 ? (
          <div className="post-list">
            {posts.map(post => (
              <div key={post.id} className="post">
                <div className="post-header">
                  <img 
                    src={post.user.profile_picture || '/static/profile_pics/default.jpg'} 
                    alt={post.user.username} 
                    className="post-profile-pic" 
                  />
                  <div className="post-user-info">
                    <div className="post-username">{post.user.username}</div>
                    <div className="post-date">{new Date(post.created_at).toLocaleDateString()}</div>
                  </div>
                </div>
                
                <div className="post-content">{post.content}</div>
                
                {/* Visa musikinnehåll om det finns */}
                {post.song && (
                  <div className="post-music">
                    <div className="post-music-info">
                      <img 
                        src={post.song.cover_url || '/static/defaults/song.jpg'} 
                        alt={post.song.title} 
                        className="post-music-image" 
                      />
                      <div className="post-music-details">
                        <div className="post-music-title">{post.song.title}</div>
                        <div className="post-music-artist">{post.song.artist}</div>
                      </div>
                    </div>
                    {post.song.embed_url && (
                      <div className="post-music-player">
                        <iframe
                          src={post.song.embed_url}
                          width="100%"
                          height="80"
                          frameBorder="0"
                          allow="encrypted-media"
                          title={post.song.title}
                        ></iframe>
                      </div>
                    )}
                  </div>
                )}
                
                {post.album && (
                  <div className="post-music">
                    <div className="post-music-info">
                      <img 
                        src={post.album.cover_url || '/static/defaults/album.jpg'} 
                        alt={post.album.title} 
                        className="post-music-image" 
                      />
                      <div className="post-music-details">
                        <div className="post-music-title">{post.album.title}</div>
                        <div className="post-music-artist">{post.album.artist}</div>
                      </div>
                    </div>
                  </div>
                )}
                
                {post.artist && (
                  <div className="post-music">
                    <div className="post-music-info">
                      <img 
                        src={post.artist.cover_url || '/static/defaults/artist.jpg'} 
                        alt={post.artist.name} 
                        className="post-music-image" 
                      />
                      <div className="post-music-details">
                        <div className="post-music-title">{post.artist.name}</div>
                      </div>
                    </div>
                  </div>
                )}
                
                <div className="post-actions">
                  <button className={`post-like-button ${post.liked_by_user ? 'liked' : ''}`}>
                    ❤️ {post.likes_count}
                  </button>
                  <button className="post-comment-button">
                    💬 {post.comments_count}
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="no-posts">No posts yet</div>
        )}
      </div>
    </div>
  );
};

export default Profile;

          <div className="favorite-songs-showcase">
            <div className="favorite-songs-container">
              <h2>Top Songs</h2>
              <ul className="favorite-songs">
                {profile.favorite_songs && profile.favorite_songs.length > 0 ? (
                  profile.favorite_songs.map((song) => (
                    <div key={song.id} className="song-item">
                      {song.embed_url ? (
                        <iframe
                          src={song.embed_url}
                          width="100%"
                          height="80"
                          frameBorder="0"
                          allow="encrypted-media"
                          title={song.title}
                        ></iframe>
                      ) : (
                        <div className="song-info">
                          <img 
                            src={song.cover_url || '/static/song_pics/default.jpg'} 
                            alt={song.title} 
                            className="song-thumbnail" 
                          />
                          <div>
                            <div className="song-title">{song.title}</div>
                            <div className="song-artist">{song.artist}</div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="no-songs">No favorite songs added yet</p>
                )}
              </ul>
            </div>

            <div className="showcase">
              {/* Song of the Day */}
              {profile.song_of_the_day && (profile.song_of_the_day.title || profile.song_of_the_day.artist) && (
                <div className="sotd-section">
                  <h2>Song of the Day</h2>
                  <div className="sotd-container">
                    <div className="sotd-image-container">
                      <img 
                        src={profile.song_of_the_day.picture || '/static/song_pics/default.jpg'} 
                        alt="Song of the day" 
                        className="sotd-image" 
                      />
                      <div className="play-button">▶</div>
                    </div>
                    <div className="sotd-info">
                      <h3>{profile.song_of_the_day.title || 'No Title'}</h3>
                      <p>{profile.song_of_the_day.artist || 'Unknown Artist'}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Album Showcase */}
              <div className="showcase-section">
                <h2>Albums</h2>
                <div className="showcase-items">
                  {profile.favorite_albums && profile.favorite_albums.length > 0 ? (
                    profile.favorite_albums.map((album) => (
                      <a 
                        key={album.id} 
                        href={album.spotify_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="showcase-item-link"
                      >
                        <img 
                          src={album.cover_url || '/static/defaults/album.jpg'} 
                          alt={album.title} 
                          className="showcase-item" 
                        />
                        <div className="showcase-item-hover">
                          <div className="showcase-item-title">{album.title}</div>
                          <div className="showcase-item-subtitle">{album.artist}</div>
                        </div>
                      </a>
                    ))
                  ) : (
                    <p className="no-items">No albums added yet</p>
                  )}
                </div>
              </div>

              {/* Artist Showcase */}
              <div className="showcase-section">
                <h2>Artists</h2>
                <div className="showcase-items">
                  {profile.favorite_artists && profile.favorite_artists.length > 0 ? (
                    profile.favorite_artists.map((artist) => (
                      <a 
                        key={artist.id} 
                        href={artist.spotify_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="showcase-item-link"
                      >
                        <img 
                          src={artist.cover_url || '/static/defaults/artist.jpg'} 
                          alt={artist.name} 
                          className="showcase-item artist-item" 
                        />
                        <div className="showcase-item-hover">
                          <div className="showcase-item-title">{artist.name}</div>
                        </div>
                      </a>
                    ))
                  ) : (
                    <p className="no-items">No artists added yet</p>
                  )}
                </div>
              </div>
            </div>
          </div>