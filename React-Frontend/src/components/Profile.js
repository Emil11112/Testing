import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import './Profile.css';

const Profile = () => {
  const { username } = useParams();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isCurrentUser, setIsCurrentUser] = useState(false);
  const [posts, setPosts] = useState([]);
  
  // Fetch profile data when component mounts or username changes
  useEffect(() => {
    const fetchProfileData = async () => {
      try {
        setLoading(true);
        
        // Fetch profile data
        const profileResponse = await axios.get(`/api/profile/${username}`);
        setProfile(profileResponse.data);
        setIsFollowing(profileResponse.data.is_following);
        
        // Check if it's the current user's profile
        const authResponse = await axios.get('/auth-status');
        if (authResponse.data.logged_in) {
          setIsCurrentUser(authResponse.data.user.username === username);
        }
        
        // Fetch user's posts
        const postsResponse = await axios.get(`/user/${username}/posts`);
        setPosts(postsResponse.data.posts || []);
        
        setLoading(false);
      } catch (error) {
        console.error('Error fetching profile:', error);
        setError('Failed to load profile');
        setLoading(false);
      }
    };
    
    fetchProfileData();
  }, [username]);
  
  // Handle follow/unfollow
  const handleFollowToggle = async () => {
    try {
      const response = await axios.post(`/api/follow/${username}`);
      
      if (response.data.success) {
        setIsFollowing(response.data.action === 'follow');
        
        // Update followers count
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
  
  if (loading) return <div className="loading">Loading profile...</div>;
  if (error) return <div className="error">{error}</div>;
  if (!profile) return <div className="not-found">Profile not found</div>;
  
  return (
    <div className="profile-container">
      <div className="profile-header">
        <img 
          src={profile.profile_picture || '/static/profile_pics/default.jpg'} 
          alt={`${profile.username}'s profile`} 
          className="profile-picture" 
        />
        
        <div className="profile-info">
          <h1>{profile.username}</h1>
          
          {profile.bio && <p className="profile-bio">{profile.bio}</p>}
          
          <div className="profile-stats">
            <span>{profile.followers_count} Followers</span>
            <span>{profile.following_count} Following</span>
          </div>
          
          {profile.favorite_genre && (
            <div className="profile-genre">
              Favorite Genre: {profile.favorite_genre}
            </div>
          )}
          
          {isCurrentUser ? (
            <Link to="/edit-profile" className="edit-profile-btn">
              Edit Profile
            </Link>
          ) : (
            <button 
              className={`follow-btn ${isFollowing ? 'following' : ''}`}
              onClick={handleFollowToggle}
            >
              {isFollowing ? 'Unfollow' : 'Follow'}
            </button>
          )}
        </div>
      </div>
      
      {/* Favorite Music Showcase */}
      <div className="music-showcase">
        {/* Favorite Songs */}
        {profile.favorite_songs && profile.favorite_songs.length > 0 && (
          <div className="favorite-section">
            <h2>Favorite Songs</h2>
            <div className="music-grid">
              {profile.favorite_songs.map(song => (
                <div key={song.id} className="music-item">
                  <img 
                    src={song.cover_url || '/static/defaults/song.jpg'} 
                    alt={song.title} 
                  />
                  <div className="music-details">
                    <h3>{song.title}</h3>
                    <p>{song.artist}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Favorite Albums */}
        {profile.favorite_albums && profile.favorite_albums.length > 0 && (
          <div className="favorite-section">
            <h2>Favorite Albums</h2>
            <div className="music-grid">
              {profile.favorite_albums.map(album => (
                <div key={album.id} className="music-item">
                  <img 
                    src={album.cover_url || '/static/defaults/album.jpg'} 
                    alt={album.title} 
                  />
                  <div className="music-details">
                    <h3>{album.title}</h3>
                    <p>{album.artist}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Favorite Artists */}
        {profile.favorite_artists && profile.favorite_artists.length > 0 && (
          <div className="favorite-section">
            <h2>Favorite Artists</h2>
            <div className="music-grid">
              {profile.favorite_artists.map(artist => (
                <div key={artist.id} className="music-item">
                  <img 
                    src={artist.cover_url || '/static/defaults/artist.jpg'} 
                    alt={artist.name} 
                  />
                  <div className="music-details">
                    <h3>{artist.name}</h3>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      
      {/* User Posts */}
      <div className="user-posts">
        <h2>Posts</h2>
        {posts.length > 0 ? (
          posts.map(post => (
            <div key={post.id} className="post">
              <div className="post-content">{post.content}</div>
              {post.song && (
                <div className="post-music">
                  <img 
                    src={post.song.cover_url || '/static/defaults/song.jpg'} 
                    alt={post.song.title} 
                  />
                  <div className="post-music-details">
                    <h3>{post.song.title}</h3>
                    <p>{post.song.artist}</p>
                  </div>
                </div>
              )}
              <div className="post-actions">
                <button>
                  ❤️ {post.likes_count} Likes
                </button>
                <button>
                  💬 {post.comments_count} Comments
                </button>
              </div>
            </div>
          ))
        ) : (
          <p>No posts yet</p>
        )}
      </div>
    </div>
  );
};

export default Profile;