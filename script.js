async function fetchAudiusSongs(query = "trending") {
    let url;

    if (query === "trending") {
        url = "https://discoveryprovider.audius.co/v1/tracks/trending?app_name=akshat_tunes";
    } else {
        url = `https://discoveryprovider.audius.co/v1/tracks/search?query=${encodeURIComponent(query)}&app_name=akshat_tunes`;
    }

    const res = await fetch(url);
    const data = await res.json();
    console.log("Audius response sample:", data.data[0]);

    songs = data.data.map(track => {
        const trackId = track.id || track.track_id; // handle both cases
        return {
            title: track.title,
            artist: track.user?.name || "Unknown Artist",
            src: trackId 
                ? `https://discoveryprovider.audius.co/v1/tracks/${trackId}/stream?app_name=akshat_tunes`
                : null,
            cover: track.artwork?.['480x480'] || "covers/default-cover.jpg"
        };
    }).filter(song => song.src !== null);

    // 🔥 Update filteredSongs with the new results
    let songs = [];
    filteredSongs = [...songs];

    // 🔥 Render them into the UI
    renderSongs(filteredSongs);

    console.log("Songs mapped:", songs);
}




// DOM Elements
const songGrid = document.getElementById('song-grid');
const audioPlayer = document.getElementById('audio-player');
const currentCover = document.getElementById('current-cover');
const currentTitle = document.getElementById('current-title');
const currentArtist = document.getElementById('current-artist');
const playBtn = document.getElementById('play-btn');
const prevBtn = document.getElementById('prev-btn');
const nextBtn = document.getElementById('next-btn');
const shuffleBtn = document.getElementById('shuffle-btn');
const repeatBtn = document.getElementById('repeat-btn');
const currentTimeEl = document.getElementById('current-time');
const totalDurationEl = document.getElementById('total-duration');
const progressBar = document.getElementById('progress');
const progressHandle = document.getElementById('progress-handle');
const progressContainer = document.querySelector('.progress-bar');
const volumeLevel = document.getElementById('volume-level');
const volumeHandle = document.getElementById('volume-handle');
const volumeBar = document.querySelector('.volume-bar');
const volumeIcon = document.getElementById('volume-icon');
const searchInput = document.getElementById('search-input');
const searchBtn = document.getElementById('search-btn');
const themeIcon = document.getElementById('theme-icon');
const playlistToggle = document.getElementById('playlist-toggle');
const playlistPanel = document.getElementById('playlist-panel');
const closePlaylistBtn = document.getElementById('close-playlist');
const likedSongsList = document.getElementById('liked-songs-list');
const playlistItems = document.querySelectorAll('.playlist');
const createPlaylistItem = document.querySelector('.playlist:last-child');

// App State
// App State
let currentSongIndex = 0;
let isPlaying = false;
let isShuffled = false;
let repeatMode = 'none'; // 'none', 'one', 'all'
let likedSongs = JSON.parse(localStorage.getItem('likedSongs')) || [];
let recentlyPlayed = JSON.parse(localStorage.getItem('recentlyPlayed')) || [];
let userPlaylists = JSON.parse(localStorage.getItem('userPlaylists')) || [];
let lastPlayedSong = localStorage.getItem('lastPlayedSong');

let songs = [];              // ✅ declare songs first
let filteredSongs = [...songs]; 
let activePlaylist = 'library'; // 'library', 'favorites', 'recent', or a custom playlist name


// Initialize the app
function initializeApp() {
    fetchAudiusSongs(); // load trending songs at startup

    
    // Set initial volume
    setVolume(0.7);
    
    // Add event listeners
    addEventListeners();
    
    // Load last played song if available
    if (lastPlayedSong) {
        const songIndex = songs.findIndex(song => song.title === lastPlayedSong);
        if (songIndex !== -1) {
            loadSong(songIndex);
        }
    }
    
    // Render playlists
    renderPlaylists();
    
    // Check for saved theme
    if (localStorage.getItem('theme') === 'light') {
        document.body.classList.add('light-theme');
        themeIcon.classList.replace('fa-moon', 'fa-sun');
    }
}

// Render songs to the grid
function renderSongs(songsToRender) {
    songGrid.innerHTML = '';
    
    songsToRender.forEach((song, index) => {
        const card = document.createElement('div');
        card.className = 'song-card';
        card.dataset.index = index;
        
        // Check if this is the currently playing song
        if (index === currentSongIndex && isPlaying) {
            card.classList.add('playing');
        }
        
        // Check if song is liked
        const isLiked = likedSongs.includes(song.title);
        
        card.innerHTML = `
            <img src="${song.cover}" alt="${song.title}" class="song-cover">
            <div class="song-info">
                <div class="song-title">${song.title}</div>
                <div class="song-artist">${song.artist}</div>
            </div>
            <div class="song-actions">
                <button class="like-btn ${isLiked ? 'liked' : ''}">
                    <i class="fas ${isLiked ? 'fa-heart' : 'fa-heart-o'}"></i>
                </button>
            </div>
        `;
        
        // Add click event to play the song
        card.querySelector('.song-cover').addEventListener('click', () => {
            loadSong(index);
            playSong();
            addToRecentlyPlayed(song.title);
        });
        
        // Add click event for like button
        card.querySelector('.like-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            toggleLikeSong(song.title);
            
            // Update like button UI
            const btn = e.currentTarget;
            btn.classList.toggle('liked');
            btn.querySelector('i').classList.toggle('fa-heart-o');
            btn.querySelector('i').classList.toggle('fa-heart');
        });
        
        songGrid.appendChild(card);
    });
}

// Load a song
function loadSong(index) {
    // Update current song index
    currentSongIndex = index;
    
    // Get the current song
    const currentSong = filteredSongs[index];
    
    // Update audio source
    audioPlayer.src = currentSong.src;
    audioPlayer.load();
    
    // Update now playing info
    currentCover.src = currentSong.cover;
    currentTitle.textContent = currentSong.title;
    currentArtist.textContent = currentSong.artist;
    
    // Save to localStorage
    localStorage.setItem('lastPlayedSong', currentSong.title);
    
    // Update currently playing card styles
    document.querySelectorAll('.song-card').forEach(card => {
        card.classList.remove('playing');
        if (parseInt(card.dataset.index) === index) {
            card.classList.add('playing');
        }
    });
}

// Play song
function playSong() {
    audioPlayer.play();
    isPlaying = true;
    playBtn.innerHTML = '<i class="fas fa-pause"></i>';
}

// Pause song
function pauseSong() {
    audioPlayer.pause();
    isPlaying = false;
    playBtn.innerHTML = '<i class="fas fa-play"></i>';
}

// Play previous song
function playPrevSong() {
    let newIndex;
    
    if (isShuffled) {
        newIndex = Math.floor(Math.random() * filteredSongs.length);
    } else {
        newIndex = (currentSongIndex - 1 + filteredSongs.length) % filteredSongs.length;
    }
    
    loadSong(newIndex);
    playSong();
    addToRecentlyPlayed(filteredSongs[newIndex].title);
}

// Play next song
function playNextSong() {
    let newIndex;
    
    if (isShuffled) {
        newIndex = Math.floor(Math.random() * filteredSongs.length);
    } else {
        newIndex = (currentSongIndex + 1) % filteredSongs.length;
    }
    
    loadSong(newIndex);
    playSong();
    addToRecentlyPlayed(filteredSongs[newIndex].title);
}

// Format time (seconds to MM:SS)
function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

// Update progress bar
function updateProgress(e) {
    const { duration, currentTime } = e.srcElement;
    
    // Update progress bar width
    if (duration) {
        const progressPercent = (currentTime / duration) * 100;
        progressBar.style.width = `${progressPercent}%`;
        progressHandle.style.left = `${progressPercent}%`;
        
        // Update time displays
        currentTimeEl.textContent = formatTime(currentTime);
        totalDurationEl.textContent = formatTime(duration);
    }
}

// Set progress bar
function setProgress(e) {
    const width = this.clientWidth;
    const clickX = e.offsetX;
    const duration = audioPlayer.duration;
    
    audioPlayer.currentTime = (clickX / width) * duration;
}

// Set volume
function setVolume(value) {
    // Constrain between 0 and 1
    value = Math.max(0, Math.min(1, value));
    
    // Update audio volume
    audioPlayer.volume = value;
    
    // Update volume bar UI
    volumeLevel.style.width = `${value * 100}%`;
    volumeHandle.style.left = `${value * 100}%`;
    
    // Update volume icon
    updateVolumeIcon(value);
}

// Update volume from click
function updateVolume(e) {
    const width = this.clientWidth;
    const clickX = e.offsetX;
    const value = clickX / width;
    
    setVolume(value);
}

// Update volume icon based on level
function updateVolumeIcon(value) {
    volumeIcon.classList.remove('fa-volume-mute', 'fa-volume-down', 'fa-volume-up');

    if (value === 0) {
        volumeIcon.classList.add('fa-volume-mute');
    } else if (value < 0.5) {
        volumeIcon.classList.add('fa-volume-down');
    } else {
        volumeIcon.classList.add('fa-volume-up');
    }
}


// Toggle volume mute
function toggleMute() {
    if (audioPlayer.volume > 0) {
        // Store current volume for unmuting
        volumeIcon.dataset.prevVolume = audioPlayer.volume;
        setVolume(0);
    } else {
        // Restore previous volume or default to 0.7
        const prevVolume = parseFloat(volumeIcon.dataset.prevVolume) || 0.7;
        setVolume(prevVolume);
    }
}

// Toggle shuffle mode
function toggleShuffle() {
    isShuffled = !isShuffled;
    shuffleBtn.classList.toggle('active');
    
    if (isShuffled) {
        shuffleBtn.style.color = 'var(--accent-color)';
    } else {
        shuffleBtn.style.color = '';
    }
}

// Toggle repeat mode
function toggleRepeat() {
    switch (repeatMode) {
        case 'none':
            repeatMode = 'all';
            repeatBtn.style.color = 'var(--accent-color)';
            repeatBtn.innerHTML = '<i class="fas fa-redo"></i>';
            break;
        case 'all':
            repeatMode = 'one';
            repeatBtn.innerHTML = '<i class="fas fa-redo-alt"></i>';
            break;
        case 'one':
            repeatMode = 'none';
            repeatBtn.style.color = '';
            repeatBtn.innerHTML = '<i class="fas fa-redo"></i>';
            break;
    }
}

// Toggle theme
function toggleTheme() {
    document.body.classList.toggle('light-theme');
    
    if (document.body.classList.contains('light-theme')) {
        themeIcon.classList.replace('fa-moon', 'fa-sun');
        localStorage.setItem('theme', 'light');
    } else {
        themeIcon.classList.replace('fa-sun', 'fa-moon');
        localStorage.setItem('theme', 'dark');
    }
}

// Toggle the playlist panel visibility
function togglePlaylistPanel() {
    playlistPanel.classList.toggle('active');
}

async function searchSongs() {
    const searchTerm = searchInput.value.trim();
    if (searchTerm === "") {
        fetchAudiusSongs("trending"); // fallback to trending
    } else {
        fetchAudiusSongs(searchTerm); // fetch based on query
    }
}

    

// Toggle like status for a song
function toggleLikeSong(songTitle) {
    const songIndex = likedSongs.indexOf(songTitle);
    
    if (songIndex === -1) {
        // Add to liked songs
        likedSongs.push(songTitle);
    } else {
        // Remove from liked songs
        likedSongs.splice(songIndex, 1);
    }
    
    // Save to localStorage
    localStorage.setItem('likedSongs', JSON.stringify(likedSongs));
    
    // If we're currently in the favorites playlist, re-render it
    if (activePlaylist === 'favorites') {
        showFavorites();
    }
}

// Add a song to recently played
function addToRecentlyPlayed(songTitle) {
    // Remove the song if it already exists in the list
    const existingIndex = recentlyPlayed.indexOf(songTitle);
    if (existingIndex !== -1) {
        recentlyPlayed.splice(existingIndex, 1);
    }
    
    // Add the song to the beginning of the list
    recentlyPlayed.unshift(songTitle);
    
    // Keep only the last 10 songs
    if (recentlyPlayed.length > 10) {
        recentlyPlayed = recentlyPlayed.slice(0, 10);
    }
    
    // Save to localStorage
    localStorage.setItem('recentlyPlayed', JSON.stringify(recentlyPlayed));
    
    // If we're currently in the recently played playlist, re-render it
    if (activePlaylist === 'recent') {
        showRecentlyPlayed();
    }
}

// Show songs from the library (all songs)
function showLibrary() {
    activePlaylist = 'library';
    filteredSongs = [...songs];
    renderSongs(filteredSongs);
    updateActivePlaylistUI();
}

// Show favorites playlist
function showFavorites() {
    activePlaylist = 'favorites';
    
    // Filter songs that are in the liked list
    filteredSongs = songs.filter(song => likedSongs.includes(song.title));
    
    if (filteredSongs.length === 0) {
        songGrid.innerHTML = '<div class="empty-playlist">No liked songs yet. Click the heart icon on songs to add them here.</div>';
    } else {
        renderSongs(filteredSongs);
    }
    
    updateActivePlaylistUI();
}

// Show recently played songs
function showRecentlyPlayed() {
    activePlaylist = 'recent';
    
    if (recentlyPlayed.length === 0) {
        songGrid.innerHTML = '<div class="empty-playlist">No recently played songs yet. Start playing songs to see them here.</div>';
        return;
    }
    
    // Create a new array of songs in the recently played order
    filteredSongs = recentlyPlayed.map(title => {
        return songs.find(song => song.title === title);
    }).filter(song => song !== undefined); // Filter out any undefined entries
    
    renderSongs(filteredSongs);
    updateActivePlaylistUI();
}

// Show a custom user playlist
function showUserPlaylist(playlistName) {
    activePlaylist = playlistName;
    
    const playlist = userPlaylists.find(p => p.name === playlistName);
    
    if (!playlist || playlist.songs.length === 0) {
        songGrid.innerHTML = `<div class="empty-playlist">No songs in this playlist yet. 
            <button id="add-to-playlist-btn" class="primary-btn">Add Songs</button>
        </div>`;
        
        // Add event listener to the button
        document.getElementById('add-to-playlist-btn').addEventListener('click', () => {
            showAddToPlaylistModal(playlistName);
        });
        return;
    }
    
    // Create a new array of songs in the playlist
    filteredSongs = playlist.songs.map(title => {
        return songs.find(song => song.title === title);
    }).filter(song => song !== undefined); // Filter out any undefined entries
    
    renderSongs(filteredSongs);
    updateActivePlaylistUI();
}

// Create a new playlist
function createNewPlaylist() {
    // Show a modal or prompt for playlist name
    const playlistName = prompt('Enter a name for your new playlist:');
    
    if (!playlistName || playlistName.trim() === '') return;
    
    // Check if playlist already exists
    if (userPlaylists.some(p => p.name === playlistName)) {
        alert('A playlist with that name already exists. Please choose another name.');
        return;
    }
    
    // Create new playlist
    const newPlaylist = {
        name: playlistName,
        songs: []
    };
    
    // Add to user playlists
    userPlaylists.push(newPlaylist);
    
    // Save to localStorage
    localStorage.setItem('userPlaylists', JSON.stringify(userPlaylists));
    
    // Render the playlists
    renderPlaylists();
    
    // Show the new playlist
    showUserPlaylist(playlistName);
}

// Show modal to add songs to a playlist
function showAddToPlaylistModal(playlistName) {
    // Create modal backdrop
    const modalBackdrop = document.createElement('div');
    modalBackdrop.className = 'modal-backdrop';
    
    // Create modal
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-header">
            <h3>Add Songs to "${playlistName}"</h3>
            <button class="close-modal"><i class="fas fa-times"></i></button>
        </div>
        <div class="modal-body">
            <div class="song-list">
                ${songs.map((song, idx) => `
                    <div class="song-list-item">
                        <input type="checkbox" id="song-${idx}" data-title="${song.title}">
                        <label for="song-${idx}">
                            <img src="${song.cover}" alt="${song.title}" class="song-list-cover">
                            <div>
                                <div class="song-list-title">${song.title}</div>
                                <div class="song-list-artist">${song.artist}</div>
                            </div>
                        </label>
                    </div>
                `).join('')}
            </div>
        </div>
        <div class="modal-footer">
            <button class="cancel-btn">Cancel</button>
            <button class="save-btn">Add Selected Songs</button>
        </div>
    `;
    
    // Add to document
    modalBackdrop.appendChild(modal);
    document.body.appendChild(modalBackdrop);
    
    // Add event listeners
    modal.querySelector('.close-modal').addEventListener('click', () => {
        document.body.removeChild(modalBackdrop);
    });
    
    modal.querySelector('.cancel-btn').addEventListener('click', () => {
        document.body.removeChild(modalBackdrop);
    });
    
    modal.querySelector('.save-btn').addEventListener('click', () => {
        // Get selected songs
        const selectedSongs = [];
        modal.querySelectorAll('input[type="checkbox"]:checked').forEach(checkbox => {
            selectedSongs.push(checkbox.dataset.title);
        });
        
        // Add to playlist
        addSongsToPlaylist(playlistName, selectedSongs);
        
        // Close modal
        document.body.removeChild(modalBackdrop);
    });
}

// Add songs to a playlist
function addSongsToPlaylist(playlistName, songTitles) {
    // Find the playlist
    const playlistIndex = userPlaylists.findIndex(p => p.name === playlistName);
    
    if (playlistIndex === -1) return;
    
    // Add songs to playlist (avoid duplicates)
    songTitles.forEach(title => {
        if (!userPlaylists[playlistIndex].songs.includes(title)) {
            userPlaylists[playlistIndex].songs.push(title);
        }
    });
    
    // Save to localStorage
    localStorage.setItem('userPlaylists', JSON.stringify(userPlaylists));
    
    // Re-render the current playlist if it's the one we're adding to
    if (activePlaylist === playlistName) {
        showUserPlaylist(playlistName);
    }
}

// Update the UI to show the active playlist
function updateActivePlaylistUI() {
    // Update the playlist items in the sidebar
    document.querySelectorAll('.playlist').forEach(item => {
        item.classList.remove('active');
    });
    
    // Update the header text
    let headerText = 'Music Library';
    
    if (activePlaylist === 'favorites') {
        document.querySelector('.playlist:nth-child(1)').classList.add('active');
        headerText = 'Favorites';
    } else if (activePlaylist === 'recent') {
        document.querySelector('.playlist:nth-child(2)').classList.add('active');
        headerText = 'Recently Played';
    } else if (activePlaylist !== 'library') {
        // It must be a custom playlist
        document.querySelectorAll('.custom-playlist').forEach(item => {
            if (item.dataset.name === activePlaylist) {
                item.classList.add('active');
            }
        });
        headerText = activePlaylist;
    }
    
    // Update the section header
    document.querySelector('.library-section h2').textContent = headerText;
}

// Render user playlists in the sidebar
function renderPlaylists() {
    // Get the playlist group container
    const playlistGroup = document.querySelector('.playlist-group');
    
    // Remove existing custom playlists
    document.querySelectorAll('.custom-playlist').forEach(item => {
        playlistGroup.removeChild(item);
    });
    
    // Keep the standard playlists and create playlist button
    const standardItems = Array.from(playlistGroup.children).slice(0, 3);
    playlistGroup.innerHTML = '';
    
    // Add back the standard items
    standardItems.forEach(item => playlistGroup.appendChild(item));
    
    // Add event listeners to the standard playlists
    playlistGroup.children[0].addEventListener('click', showFavorites);
    playlistGroup.children[1].addEventListener('click', showRecentlyPlayed);
    playlistGroup.children[2].addEventListener('click', createNewPlaylist); // Create playlist
    
    // Add custom playlists
    userPlaylists.forEach(playlist => {
        const playlistItem = document.createElement('div');
        playlistItem.className = 'playlist custom-playlist';
        playlistItem.dataset.name = playlist.name;
        
        playlistItem.innerHTML = `
            <i class="fas fa-list"></i>
            <span>${playlist.name}</span>
            <button class="delete-playlist-btn" data-name="${playlist.name}">
                <i class="fas fa-trash"></i>
            </button>
        `;
        
        // Add event listener to show the playlist
        playlistItem.addEventListener('click', (e) => {
            // Don't trigger if the delete button was clicked
            if (e.target.closest('.delete-playlist-btn')) return;
            showUserPlaylist(playlist.name);
        });
        
        // Add event listener to delete the playlist
        playlistItem.querySelector('.delete-playlist-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            deletePlaylist(playlist.name);
        });
        
        playlistGroup.appendChild(playlistItem);
    });
}

// Delete a playlist
function deletePlaylist(playlistName) {
    if (!confirm(`Are you sure you want to delete the playlist "${playlistName}"?`)) return;
    
    // Remove the playlist from the list
    userPlaylists = userPlaylists.filter(p => p.name !== playlistName);
    
    // Save to localStorage
    localStorage.setItem('userPlaylists', JSON.stringify(userPlaylists));
    
    // Re-render the playlists
    renderPlaylists();
    
    // If we were viewing the deleted playlist, show the library instead
    if (activePlaylist === playlistName) {
        showLibrary();
    }
}

// Add all event listeners
function addEventListeners() {
    // Play/Pause button
    playBtn.addEventListener('click', () => {
        if (isPlaying) {
            pauseSong();
        } else {
            playSong();
        }
    });
    
    // Previous button
    prevBtn.addEventListener('click', playPrevSong);
    
    // Next button
    nextBtn.addEventListener('click', playNextSong);
    
    // Time/song update
    audioPlayer.addEventListener('timeupdate', updateProgress);
    
    // Click on progress bar
    progressContainer.addEventListener('click', setProgress);
    
    // Song ends
    audioPlayer.addEventListener('ended', () => {
        switch (repeatMode) {
            case 'one':
                // Repeat the current song
                audioPlayer.currentTime = 0;
                playSong();
                break;
            case 'all':
                // Play next song and loop back to first if at end
                playNextSong();
                break;
            default:
                // Play next song if available, otherwise stop
                if (currentSongIndex < filteredSongs.length - 1) {
                    playNextSong();
                } else {
                    pauseSong();
                    audioPlayer.currentTime = 0;
                    updateProgress({ srcElement: audioPlayer });
                }
        }
    });
    
    // Volume control
    volumeBar.addEventListener('click', updateVolume);
    
    // Volume icon click (mute/unmute)
    volumeIcon.addEventListener('click', toggleMute);
    
    // Shuffle button
    shuffleBtn.addEventListener('click', toggleShuffle);
    
    // Repeat button
    repeatBtn.addEventListener('click', toggleRepeat);
    
    // Theme toggle
    themeIcon.addEventListener('click', toggleTheme);
    
    // Search input
    searchInput.addEventListener('input', searchSongs);
    
    // Search button
    searchBtn.addEventListener('click', searchSongs);
    
    // Playlist toggle
    playlistToggle.addEventListener('click', togglePlaylistPanel);
    
    // Close playlist button
    closePlaylistBtn.addEventListener('click', togglePlaylistPanel);
    
    // Keyboard shortcuts
    document.addEventListener('keydown', e => {
        if (e.target.tagName === 'INPUT') return; // Don't trigger if typing in an input
        
        switch (e.code) {
            case 'Space':
                e.preventDefault();
                if (isPlaying) {
                    pauseSong();
                } else {
                    playSong();
                }
                break;
            case 'ArrowLeft':
                // Rewind 5 seconds
                audioPlayer.currentTime = Math.max(0, audioPlayer.currentTime - 5);
                break;
            case 'ArrowRight':
                // Forward 5 seconds
                audioPlayer.currentTime = Math.min(audioPlayer.duration, audioPlayer.currentTime + 5);
                break;
            case 'ArrowUp':
                // Increase volume
                setVolume(Math.min(1, audioPlayer.volume + 0.1));
                break;
            case 'ArrowDown':
                // Decrease volume
                setVolume(Math.max(0, audioPlayer.volume - 0.1));
                break;
        }
    });
}

// Initialize the app when DOM is loaded

document.addEventListener('DOMContentLoaded', initializeApp);





