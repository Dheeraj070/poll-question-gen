import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Clock, BarChart2, AlertCircle, Loader2, Play, Square, MoreVertical, Eye } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { useAuth } from "@/lib/hooks/use-auth";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";

const API_URL = import.meta.env.VITE_API_URL;

interface Room {
    roomCode: string;
    name: string;
    createdAt: string;
    status: 'active' | 'ended';
    teacherId: string;
    polls: {
        _id: string;
        question: string;
        options: string[];
        correctOptionIndex: number;
        answers: { userId: string; answerIndex: number }[];
    }[];
}

export default function ManageRoom() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [rooms, setRooms] = useState<Room[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [endingRoom, setEndingRoom] = useState<string | null>(null);

    useEffect(() => {
        const fetchRooms = async () => {
            if (!user?.uid) {
                setError("Authentication required");
                setLoading(false);
                return;
            }
            try {
                setLoading(true);
                setError(null);
                const response = await fetch(`${API_URL}/livequizzes/rooms/teacher/${user.uid}`, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        //'Authorization': `Bearer ${user?.token}`
                    },
                });
                if (!response.ok) {
                    throw new Error(`Failed to fetch rooms: ${response.status}`);
                }

                const data = await response.json();

                // Sort rooms: active first, then ended
                const sortedRooms = data.sort((a: Room, b: Room) => {
                    // Active rooms come first
                    if (a.status === 'active' && b.status === 'ended') return -1;
                    if (a.status === 'ended' && b.status === 'active') return 1;

                    // If both have the same status, sort by creation date (newest first)
                    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
                });

                setRooms(sortedRooms);
            } catch (err) {
                console.error('Error fetching rooms:', err);
                setError(err instanceof Error ? err.message : 'Failed to fetch rooms');
            } finally {
                setLoading(false);
            }
        };

        fetchRooms();
    }, [user?.uid]);

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    };

    const calculateParticipants = (room: Room) => {
        const uniqueParticipants = new Set();
        room.polls.forEach(poll => {
            poll.answers.forEach(answer => {
                uniqueParticipants.add(answer.userId);
            });
        });
        return uniqueParticipants.size;
    };

    const calculateDuration = (room: Room) => {
        // This is a placeholder calculation since we don't have duration data
        // You might want to store actual session duration in your backend
        const pollCount = room.polls.length;
        const estimatedDuration = pollCount * 2; // Estimate 2 minutes per poll
        return `~${estimatedDuration} mins`;
    };

   /* const getStatusColor = (status: string) => {
        return status === 'active'
            ? 'text-green-600 dark:text-green-400'
            : 'text-gray-600 dark:text-gray-400';
    };*/

    const handleEndRoom = async (roomCode: string, event: React.MouseEvent) => {
        event.stopPropagation();
        setEndingRoom(roomCode);
        
        try {
            const response = await fetch(`${API_URL}/livequizzes/rooms/${roomCode}/end`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
            });
            
            if (!response.ok) {
                throw new Error('Failed to end room');
            }
            
            // Update the room status locally
            setRooms(prevRooms => 
                prevRooms.map(room => 
                    room.roomCode === roomCode 
                        ? { ...room, status: 'ended' as const }
                        : room
                )
            );
        } catch (err) {
            console.error('Error ending room:', err);
        } finally {
            setEndingRoom(null);
        }
    };

    const handleReturnToRoom = (roomCode: string, event: React.MouseEvent) => {
        event.stopPropagation();
        navigate({ to: `/teacher/pollroom/${roomCode}` });
    };

    const handleViewAnalysis = (roomCode: string, event: React.MouseEvent) => {
        event.stopPropagation();
        navigate({ to: `/teacher/manage-rooms/pollanalysis/${roomCode}` });
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-[calc(100vh-5rem)]">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                <p className="mt-4 text-lg text-gray-600 dark:text-gray-300">Loading assessment sessions...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center h-[calc(100vh-5rem)]">
                <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
                <p className="text-lg text-red-600 dark:text-red-400 mb-4">{error}</p>
                <Button
                    onClick={() => window.location.reload()}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                    Retry
                </Button>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto p-6">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-blue-900 dark:text-blue-100">Assessment Sessions</h1>
                    <p className="text-gray-600 dark:text-gray-400">
                        Manage your active and completed assessment sessions
                    </p>
                </div>
                <Button
                    onClick={() => navigate({ to: '/teacher/pollroom' })}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                    Create New Session
                </Button>
            </div>

            {rooms.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg">
                    <BarChart2 className="h-12 w-12 text-gray-400 mb-4" />
                    <h3 className="text-lg font-medium text-gray-600 dark:text-gray-300 mb-2">
                        No assessment sessions found
                    </h3>
                    <p className="text-gray-500 dark:text-gray-400 mb-4">
                        Create your first session to begin interactive assessments
                    </p>
                    <Button
                        onClick={() => navigate({ to: '/teacher/pollroom' })}
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                        Create Session
                    </Button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {rooms.map((room) => (
                        <Card
                            key={room.roomCode}
                            className={`transition-all hover:shadow-lg ${
                                room.status === 'ended' ? 'cursor-pointer hover:border-blue-300' : ''
                            }`}
                            onClick={() => room.status === 'ended' ? handleViewAnalysis(room.roomCode, {} as React.MouseEvent) : undefined}
                        >
                            <CardHeader className="pb-4">
                                <div className="flex items-start justify-between">
                                    <CardTitle className="text-lg font-semibold text-blue-800 dark:text-blue-200">
                                        {room.name}
                                    </CardTitle>
                                    <Badge 
                                        variant={room.status === 'active' ? 'default' : 'secondary'}
                                        className={`${
                                            room.status === 'active' 
                                                ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                                                : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400'
                                        }`}
                                    >
                                        {room.status === 'active' ? 'Active' : 'Completed'}
                                    </Badge>
                                </div>
                                <div className="text-sm text-blue-600 dark:text-blue-400">
                                    {formatDate(room.createdAt)}
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-2 gap-4 mb-4">
                                    <div className="flex items-center gap-2">
                                        <Users className="h-4 w-4 text-blue-500" />
                                        <div>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">Participants</p>
                                            <p className="font-medium">{calculateParticipants(room)}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <BarChart2 className="h-4 w-4 text-blue-500" />
                                        <div>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">Questions</p>
                                            <p className="font-medium">{room.polls.length}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Clock className="h-4 w-4 text-blue-500" />
                                        <div>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">Duration</p>
                                            <p className="font-medium">{calculateDuration(room)}</p>
                                        </div>
                                    </div>
                                </div>

                                {room.status === 'active' ? (
                                    <div className="flex gap-2">
                                        <Button
                                            onClick={(e) => handleReturnToRoom(room.roomCode, e)}
                                            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                                        >
                                            <Play className="h-4 w-4 mr-2" />
                                            Continue
                                        </Button>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="outline" size="icon">
                                                    <MoreVertical className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem 
                                                    onClick={(e) => handleEndRoom(room.roomCode, e)}
                                                    disabled={endingRoom === room.roomCode}
                                                    className="text-red-600 focus:text-red-600 dark:text-red-400"
                                                >
                                                    {endingRoom === room.roomCode ? (
                                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                                    ) : (
                                                        <Square className="h-4 w-4 mr-2" />
                                                    )}
                                                    End Session
                                                </DropdownMenuItem>
                                                <DropdownMenuItem 
                                                    onClick={(e) => handleViewAnalysis(room.roomCode, e)}
                                                >
                                                    <Eye className="h-4 w-4 mr-2" />
                                                    View Analysis
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
                                ) : (
                                    <Button 
                                        onClick={(e) => handleViewAnalysis(room.roomCode, e)}
                                        variant="outline"
                                        className="w-full border-blue-300 text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/20"
                                    >
                                        <Eye className="h-4 w-4 mr-2" />
                                        View Results
                                    </Button>
                                )}
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}