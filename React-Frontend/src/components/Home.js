import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import './Home.css';

const Home = ({ user }) => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [newPostContent, setNewPostContent] = useState('');
  const [postingInProgress, setPostingInProgress] = useState(false);
  const [selectedMusic, setSelectedMusic] = useState(null);
  const [musicSearchQuery, setMusicSearchQuery] = useState('');
  const [musicSearchResults, setMusicSearchResults] = useState([]);
  const [musicSearchLoading, setMusicSearchLoading] = useState(false);
  const [showMusicSearch, setShowMusicSearch] = useState(false);

  // Hämta inlägg när komponenten laddas och när sidan ändras
  useEffect(() => {
    fetchPosts();
  }, [page, fetchPosts]);

  // Funktion för att hämta inlägg
  const fetchPosts = async (refresh = false) => {
    try {
      setLoading(true);
      
      // Om refresh är true, återställ till första sidan
      const currentPage = refresh ? 1 : page;
      
      const response = await axios.get(`/api/posts?page=${currentPage}&per_page=10`);
      
      if (refresh) {
        setPosts(response.data.posts);
        setPage(1);
      } else {
        // Lägg till nya inlägg till befintliga om vi laddar nästa sida
        setPosts(prevPosts => 
          currentPage === 1 ? response.data.posts : [...prevPosts, ...response.data.posts]
        );
      }
      
      setHasMore(response.data.has_next);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching posts:', error);
      setError('Failed to load posts');
      setLoading(false);
    }
  };

  // Sök efter musik via Spotify API
  const searchMusic = async (searchType = 'track') => {
    if (!musicSearchQuery.trim()) return;
    
    try {
      setMusicSearchLoading(true);
      const response = await axios.get(`/api/search/music?q=${encodeURIComponent(musicSearchQuery)}&type=${searchType}`);
      setMusicSearchResults(response.data);
      setMusicSearchLoading(false);
    } catch (error) {
      console.error('Error searching music:', error);
      setMusicSearchLoading(false);
    }
  };

  // Skapa ett nytt inlägg
  const createPost = async () => {
    if (!newPostContent.trim()) return;
    
    try {
      setPostingInProgress(true);
      
      const postData = {
        content: newPostContent
      };
      
      // Lägg till musikreferens om det finns
      if (selectedMusic) {
        if (selectedMusic.type === 'track') {
          postData.song_id = selectedMusic.id;
        } else if (selectedMusic.type === 'album') {
          postData.album_id = selectedMusic.id;
        } else if (selectedMusic.type === 'artist') {
          postData.artist_id = selectedMusic.id;
        }
      }
      
      await axios.post('/api/posts', postData);
      
      // Rensa formuläret och uppdatera inläggsflödet
      setNewPostContent('');
      setSelectedMusic(null);
      fetchPosts(true);
      setPostingInProgress(false);
    } catch (error) {
      console.error('Error creating post:', error);
      setPostingInProgress(false);
    }
  };

  // Gilla/ogilla ett inlägg
  const toggleLike = async (postId) => {
    try {
      const response = await axios.post(`/api/posts/${postId}/like`);
      
      // Uppdatera likes i localstorage för att reflektera ändringen
      setPosts(prevPosts => 
        prevPosts.map(post => 
          post.id === postId 
            ? { 
                ...post, 
                liked_by_user: response.data.action === 'liked',
                likes_count: response.data.likes_count
              } 
            : post
        )
      );
    } catch (error) {
      console.error('Error toggling like:', error);
    }
  };

  // Välj musik från sökresultaten
  const selectMusic = (item, type) => {
    setSelectedMusic({
      ...item,
      type
    });
    setShowMusicSearch(false);
  };

  return (
    <div className="home-container">
      {/* Inläggsformulär */}
      <div className="create-post-container">
        <div className="post-form">
          <textarea
            className="post-input"
            placeholder="What's on your mind?"
            value={newPostContent}
            onChange={(e) => setNewPostContent(e.target.value)}
            disabled={postingInProgress}
          />
          
          {/* Visa vald musik om det finns */}
          {selectedMusic && (
            <div className="selected-music">
              <img 
                src={selectedMusic.cover_url || (selectedMusic.type === 'artist' ? selectedMusic.image_url : null) || '/static/defaults/music.jpg'} 
                alt={selectedMusic.title || selectedMusic.name} 
                className="selected-music-image" 
              />
              <div className="selected-music-info">
                <div className="selected-music-title">{selectedMusic.title || selectedMusic.name}</div>
                {selectedMusic.artist && <div className="selected-music-artist">{selectedMusic.artist}</div>}
                <button 
                  className="remove-music-button"
                  onClick={() => setSelectedMusic(null)}
                >
                  ✕
                </button>
              </div>
            </div>
          )}
          
          <div className="post-form-actions">
            <div className="post-form-buttons">
              <button 
                className="add-music-button"
                onClick={() => setShowMusicSearch(!showMusicSearch)}
              >
                🎵 Add Music
              </button>
              
              <button 
                className="post-button"
                onClick={createPost}
                disabled={postingInProgress || !newPostContent.trim()}
              >
                {postingInProgress ? 'Posting...' : 'Post'}
              </button>
            </div>
            
            {/* Musiksökformulär */}
            {showMusicSearch && (
              <div className="music-search">
                <div className="search-input-container">
                  <input 
                    type="text"
                    className="music-search-input"
                    placeholder="Search for songs, albums or artists"
                    value={musicSearchQuery}
                    onChange={(e) => setMusicSearchQuery(e.target.value)}
                  />
                  <div className="search-buttons">
                    <button 
                      className="search-button"
                      onClick={() => searchMusic('track')}
                      disabled={musicSearchLoading}
                    >
                      🎵 Songs
                    </button>
                    <button 
                      className="search-button"
                      onClick={() => searchMusic('album')}
                      disabled={musicSearchLoading}
                    >
                      💿 Albums
                    </button>
                    <button 
                      className="search-button"
                      onClick={() => searchMusic('artist')}
                      disabled={musicSearchLoading}
                    >
                      🎤 Artists
                    </button>
                  </div>
                </div>
                
                {musicSearchLoading ? (
                  <div className="search-loading">Searching...</div>
                ) : musicSearchResults.title || musicSearchResults.name ? (
                  <div className="search-results">
                    {/* Visa olika typer av resultat beroende på vad vi sökt efter */}
                    {musicSearchResults.title && musicSearchResults.artist && (
                      <div 
                        className="search-result-item"
                        onClick={() => selectMusic(musicSearchResults, 'track')}
                      >
                        <img 
                          src={musicSearchResults.cover_url || '/static/defaults/song.jpg'} 
                          alt={musicSearchResults.title} 
                          className="result-image" 
                        />
                        <div className="result-info">
                          <div className="result-title">{musicSearchResults.title}</div>
                          <div className="result-subtitle">{musicSearchResults.artist}</div>
                        </div>
                      </div>
                    )}
                    
                    {musicSearchResults.title && musicSearchResults.release_date && (
                      <div 
                        className="search-result-item"
                        onClick={() => selectMusic(musicSearchResults, 'album')}
                      >
                        <img 
                          src={musicSearchResults.cover_url || '/static/defaults/album.jpg'} 
                          alt={musicSearchResults.title} 
                          className="result-image" 
                        />
                        <div className="result-info">
                          <div className="result-title">{musicSearchResults.title}</div>
                          <div className="result-subtitle">{musicSearchResults.artist}</div>
                        </div>
                      </div>
                    )}
                    
                    {musicSearchResults.name && musicSearchResults.genres && (
                      <div 
                        className="search-result-item"
                        onClick={() => selectMusic(musicSearchResults, 'artist')}
                      >
                        <img 
                          src={musicSearchResults.cover_url || musicSearchResults.image_url || '/static/defaults/artist.jpg'} 
                          alt={musicSearchResults.name} 
                          className="result-image" 
                        />
                        <div className="result-info">
                          <div className="result-title">{musicSearchResults.name}</div>
                          <div className="result-subtitle">
                            {musicSearchResults.genres.slice(0, 3).join(', ')}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  musicSearchQuery && <div className="no-results">No results found</div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Inläggsflöde */}
      <div className="posts-container">
        <h2>Feed</h2>
        
        {loading && page === 1 ? (
          <div className="loading">Loading posts...</div>
        ) : error ? (
          <div className="error">{error}</div>
        ) : posts.length > 0 ? (
          <>
            <div className="post-list">
              {posts.map(post => (
                <div key={post.id} className="post">
                  <div className="post-header">
                    <Link to={`/profile/${post.user.username}`} className="post-user-link">
                      <img 
                        src={post.user.profile_picture || '/static/profile_pics/default.jpg'} 
                        alt={post.user.username} 
                        className="post-profile-pic" 
                      />
                      <div className="post-user-info">
                        <div className="post-username">{post.user.username}</div>
                        <div className="post-date">{new Date(post.created_at).toLocaleDateString()}</div>
                      </div>
                    </Link>
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
                    <button 
                      className={`post-like-button ${post.liked_by_user ? 'liked' : ''}`}
                      onClick={() => toggleLike(post.id)}
                    >
                      {post.liked_by_user ? '❤️' : '🤍'} {post.likes_count}
                    </button>
                    <button 
                      className="post-comment-button"
                      onClick={() => {
                        // Implementera kommentarsfunktionalitet
                      }}
                    >
                      💬 {post.comments_count}
                    </button>
                  </div>
                </div>
              ))}
            </div>
            
            {/* Knapp för att ladda fler inlägg */}
            {hasMore && (
              <div className="load-more">
                <button 
                  className="load-more-button"
                  onClick={() => setPage(page + 1)}
                  disabled={loading}
                >
                  {loading ? 'Loading...' : 'Load More'}
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="no-posts">
            No posts yet. Follow some users or create your first post!
          </div>
        )}
      </div>
    </div>
  );
};

export default Home;