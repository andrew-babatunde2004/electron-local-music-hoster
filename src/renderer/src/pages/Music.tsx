import Navbar from "../components/Navbar";
import "./Music.css";
import {useState, useEffect, useRef} from 'react';
import axios from "axios";
import { motion } from "motion/react";

interface Song {
    id: string;
    title: string;
    artist: string;
    audioUrl: string;
}

function Music() {
    const [songs, setSongs] = useState<Song[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentSong, setCurrentSong] = useState<Song | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [volume, setVolume] = useState(1);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const [IP, setIP] = useState('');

    useEffect(() => {
        if (!IP) return;

        setLoading(true);
        axios.get(IP)
            .then(response => {
                setSongs(response.data);
                setLoading(false);
            })
            .catch(error => {
                console.error("error", error);
                setLoading(false);
            });
    }, [IP]);

    useEffect(() => {
        if (audioRef.current) {
            audioRef.current.volume = volume;
        }
    }, [volume]);

    useEffect(() => {
        if (audioRef.current) {
            if (isPlaying) {
                audioRef.current.play();
            } else {
                audioRef.current.pause();
            }
        }
    }, [isPlaying, currentSong]);

    const handleSongSelect = (song: Song) => {
        if (currentSong?.id === song.id) {
            setIsPlaying(!isPlaying);
        } else {
            setCurrentSong(song);
            setIsPlaying(true);
        }
    };

    const handleTimeUpdate = () => {
        if (audioRef.current) {
            setCurrentTime(audioRef.current.currentTime);
            setDuration(audioRef.current.duration);
        }
    };

    const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newTime = parseFloat(e.target.value);
        if (audioRef.current) {
            audioRef.current.currentTime = newTime;
            setCurrentTime(newTime);
        }
    };

    const formatTime = (seconds: number) => {
        if (isNaN(seconds)) return "0:00";
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const handlePrevious = () => {
        if (!currentSong) return;
        const currentIndex = songs.findIndex(s => s.id === currentSong.id);
        const prevIndex = currentIndex > 0 ? currentIndex - 1 : songs.length - 1;
        setCurrentSong(songs[prevIndex]);
        setIsPlaying(true);
    };

    const handleNext = () => {
        if (!currentSong) return;
        const currentIndex = songs.findIndex(s => s.id === currentSong.id);
        const nextIndex = currentIndex < songs.length - 1 ? currentIndex + 1 : 0;
        setCurrentSong(songs[nextIndex]);
        setIsPlaying(true);
    };

    return (
        <>
            <Navbar />
            <div className="music-container">
                <div className="music-content">
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                        className="music-header"
                    >
                      <label htmlFor="api-input">API input</label>
                                 <input 
  type="text" 
  value={IP} 
  onChange={e => setIP(e.target.value)}
  onPaste={e => setIP(e.clipboardData.getData('text'))}
/>
                    
                    </motion.div>

                    {loading ? (
                        <div className="loading-container">
                            <div className="spinner"></div>
                            <p>Loading songs...</p>
                        </div>
                    ) : songs.length === 0 ? (
                        <div className="empty-state">
                            <p>No songs available</p>
                        </div>
                    ) : (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.6, delay: 0.2 }}
                            className="songs-grid"
                        >
                            {songs.map((song, index) => (
                                <motion.div
                                    key={song.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.4, delay: index * 0.1 }}
                                    className={`song-card ${currentSong?.id === song.id ? 'active' : ''}`}
                                    onClick={() => handleSongSelect(song)}
                                >
                                    <div className="song-card-content">
                                        <div className="song-icon">
                                            {currentSong?.id === song.id && isPlaying ? (
                                                <span className="playing-icon">🎵</span>
                                            ) : (
                                                <span className="play-icon">▶</span>
                                            )}
                                        </div>
                                        <div className="song-info">
                                            <h3>{song.title}</h3>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </motion.div>
                    )}

                    {currentSong && (
                        <motion.div
                            initial={{ opacity: 0, y: 50 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5 }}
                            className="music-player"
                        >
                            <audio
                                ref={audioRef}
                                src={currentSong.audioUrl}
                                onTimeUpdate={handleTimeUpdate}
                                onLoadedMetadata={handleTimeUpdate}
                                onEnded={handleNext}
                            />
                            
                            <div className="player-info">
                                <div className="current-song-info">
                                    <h3>{currentSong.title}</h3>
                                    
                                </div>
                            </div>

                            <div className="player-controls">
                                <button className="control-btn" onClick={handlePrevious} title="Previous">
                                    ⏮
                                </button>
                                <button 
                                    className="control-btn play-pause" 
                                    onClick={() => setIsPlaying(!isPlaying)}
                                    title={isPlaying ? "Pause" : "Play"}
                                >
                                    {isPlaying ? "⏸" : "▶"}
                                </button>
                                <button className="control-btn" onClick={handleNext} title="Next">
                                    ⏭
                                </button>
                            </div>

                            <div className="player-progress">
                                <span className="time">{formatTime(currentTime)}</span>
                                <input
                                    type="range"
                                    min="0"
                                    max={duration || 0}
                                    value={currentTime}
                                    onChange={handleSeek}
                                    className="progress-bar"
                                />
                                <span className="time">{formatTime(duration)}</span>
                            </div>

                            <div className="player-volume">
                                <span>🔊</span>
                                <input
                                    type="range"
                                    min="0"
                                    max="1"
                                    step="0.01"
                                    value={volume}
                                    onChange={(e) => setVolume(parseFloat(e.target.value))}
                                    className="volume-bar"
                                />
                                <span>{Math.round(volume * 100)}%</span>
                            </div>
                        </motion.div>
                    )}
                </div>
            </div>
        </>
    );
}

export default Music;
