import { useState, useRef } from "react";
import { useParams, useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { Upload, Mic, MicOff, Youtube, Wand2, Edit3, X, Loader2, LogOut, AlertTriangle } from "lucide-react";
import api from "@/lib/api/api";
import { useAuthStore } from '@/lib/store/auth-store';

const copyToClipboard = (text: string) => {
  navigator.clipboard.writeText(text).then(() => {
    toast.success("Room code copied to clipboard!");
  }).catch(() => {
    toast.error("Failed to copy room code");
  });
};

type PollResults = Record<string, Record<string, { count: number; users: string[] }>>;

type GeneratedQuestion = {
  question: string;
  options: string[];
  correctOptionIndex: number;
};

export default function TeacherPollRoom() {
  const params = useParams({ from: '/teacher/pollroom/$code' });
  const navigate = useNavigate();
  const roomCode = params.code;
  const { user } = useAuthStore();
  // Existing state
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", "", "", ""]);
  const [correctOptionIndex, setCorrectOptionIndex] = useState<number>(0);
  const [timer, setTimer] = useState<number>(30);
  const [pollResults, setPollResults] = useState<PollResults>({});

  // End room state
  const [isEndingRoom, setIsEndingRoom] = useState(false);
  const [showEndRoomConfirm, setShowEndRoomConfirm] = useState(false);

  // GenAI feature state
  const [activeTab, setActiveTab] = useState<'manual' | 'genai'>('manual');
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordedAudio, setRecordedAudio] = useState<Blob | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedQuestions, setGeneratedQuestions] = useState<GeneratedQuestion[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [editingQuestionIndex, setEditingQuestionIndex] = useState<number | null>(null);
  const [questionSpec, setQuestionSpec] = useState("");
  const [selectedModel, setSelectedModel] = useState("gemma3");

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!roomCode) return <div>Loading...</div>;

  const endRoom = async () => {
    setIsEndingRoom(true);
    try {
      await api.post(`/livequizzes/rooms/${roomCode}/end`, {
        teacherId: user?.userId, // replace with real teacher ID
      });

      toast.success("Room ended successfully");

      // Clean up any ongoing recordings
      if (mediaRecorderRef.current && isRecording) {
        mediaRecorderRef.current.stop();
        setIsRecording(false);
      }

      // Navigate back to teacher dashboard or rooms list
      navigate({ to: '/teacher/pollroom' });
    } catch (error: any) {
      console.error('Error ending room:', error);
      toast.error(error.response?.data?.message || "Failed to end room");
    } finally {
      setIsEndingRoom(false);
      setShowEndRoomConfirm(false);
    }
  };

  const createPoll = async () => {
    try {
      await api.post(`/livequizzes/rooms/${roomCode}/polls`, {
        question,
        options: options.filter(opt => opt.trim()),
        creatorId: user?.userId, // replace with real ID
        timer: Number(timer),
        correctOptionIndex
      });
      toast.success("Poll created!");
      setQuestion("");
      setOptions(["", "", "", ""]);
      setCorrectOptionIndex(0);
      setShowPreview(false);
      setGeneratedQuestions([]);
    } catch {
      toast.error("Failed to create poll");
    }
  };

  const fetchResults = async () => {
    try {
      const res = await api.get(`/livequizzes/rooms/${roomCode}/polls/results`);
      setPollResults(res.data);
    } catch {
      toast.error("Failed to fetch results");
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);

      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        setRecordedAudio(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      toast.success("Recording started");
    } catch (error) {
      toast.error("Failed to start recording");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      toast.success("Recording stopped");
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setAudioFile(file);
      toast.success("File uploaded");
    }
  };

  const generateQuestions = async () => {
    if (!youtubeUrl && !audioFile && !recordedAudio) {
      toast.error("Please provide YouTube URL, upload file, or record audio");
      return;
    }

    setIsGenerating(true);
    try {
      const formData = new FormData();
      if (youtubeUrl) formData.append('youtubeUrl', youtubeUrl);
      if (audioFile) formData.append('file', audioFile);
      else if (recordedAudio) {
        const file = new File([recordedAudio], 'recording.wav', { type: 'audio/wav' });
        formData.append('file', file);
      }
      if (questionSpec) formData.append('questionSpec', questionSpec);
      formData.append('model', selectedModel);

      const response = await api.post(`/livequizzes/rooms/${roomCode}/generate-questions`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const rawQuestions = response.data.questions || [];

      // ✅ Transform backend shape → frontend shape
      const cleanQuestions = rawQuestions.map((q: any): GeneratedQuestion => ({
        question: q.questionText ?? '', // backend field is questionText
        options: Array.isArray(q.options) ? q.options.map((opt: any) => opt.text ?? '') : [],
        correctOptionIndex: Array.isArray(q.options) ? q.options.findIndex((opt: any) => opt.correct) : 0,
      }));

      console.log("Generated questions:", cleanQuestions);
      setGeneratedQuestions(cleanQuestions);
      setShowPreview(true);
      toast.success(`Generated ${cleanQuestions.length} questions successfully!`);
    } catch (error: any) {
      console.error('Error generating questions:', error);
      toast.error(error.response?.data?.message || "Failed to generate questions");
    } finally {
      setIsGenerating(false);
    }
  };

  // Add this function to your component
  const deleteGeneratedQuestion = (index: number) => {
    const updated = generatedQuestions.filter((_, i) => i !== index);
    setGeneratedQuestions(updated);
    if (editingQuestionIndex === index) {
      setEditingQuestionIndex(null);
    } else if (editingQuestionIndex !== null && editingQuestionIndex > index) {
      setEditingQuestionIndex(editingQuestionIndex - 1);
    }
    if (updated.length === 0) {
      setShowPreview(false);
    }
    toast.success("Question deleted");
  };

  const selectGeneratedQuestion = (questionData: GeneratedQuestion) => {
    setQuestion(questionData.question);
    setOptions([...questionData.options, ...Array(4 - questionData.options.length).fill("")]);
    setCorrectOptionIndex(questionData.correctOptionIndex);
    setActiveTab('manual');
  };

  const editGeneratedQuestion = (index: number, field: string, value: string | number) => {
    const updated = [...generatedQuestions];
    if (field === 'question') {
      updated[index].question = value as string;
    } else if (field === 'correctOptionIndex') {
      updated[index].correctOptionIndex = value as number;
    } else if (field.startsWith('option-')) {
      const optionIndex = parseInt(field.split('-')[1]);
      updated[index].options[optionIndex] = value as string;
    }
    setGeneratedQuestions(updated);
  };

  const clearGenAIData = () => {
    setYoutubeUrl("");
    setAudioFile(null);
    setRecordedAudio(null);
    setGeneratedQuestions([]);
    setShowPreview(false);
    setQuestionSpec("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <main className="relative flex-1 p-3 sm:p-6 lg:p-8">
      <div className="relative z-10 max-w-lg sm:max-w-2xl md:max-w-3xl lg:max-w-4xl mx-auto">
        <Card className="bg-white/90 backdrop-blur-sm border border-slate-200/80 shadow-lg dark:bg-gray-900/90 dark:border-gray-700/80">
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0">
              <CardTitle className="text-lg sm:text-2xl">
                Room Code: <span className="font-mono bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent dark:from-purple-400 dark:to-blue-400">
                  {roomCode}
                </span>
              </CardTitle>
              <div className="flex items-center gap-2 sm:gap-4 mt-2 sm:mt-0">
                <Button
                  onClick={() => copyToClipboard(roomCode)}
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-1 sm:gap-2 text-purple-600 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300 text-xs sm:text-sm"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                  </svg>
                  <span className="hidden xs:inline">Copy Code</span>
                </Button>
                <Button
                  onClick={() => setShowEndRoomConfirm(true)}
                  variant="destructive"
                  className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm"
                  disabled={isEndingRoom}
                >
                  <LogOut size={16} />
                  <span className="hidden xs:inline">End Room</span>
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 sm:space-y-6">
            {/* End Room Confirmation Modal */}
            {showEndRoomConfirm && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                <Card className="w-full max-w-md mx-4 bg-white dark:bg-gray-800">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                      <AlertTriangle size={20} />
                      End Room Confirmation
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-gray-700 dark:text-gray-300">
                      Are you sure you want to end this room? This action cannot be undone.
                    </p>
                    <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                      <li>• All students will be disconnected</li>
                      <li>• Active polls will be stopped</li>
                      <li>• Room will be permanently closed</li>
                    </ul>
                    <div className="flex gap-3 justify-end">
                      <Button
                        onClick={() => setShowEndRoomConfirm(false)}
                        variant="outline"
                        disabled={isEndingRoom}
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={endRoom}
                        variant="destructive"
                        disabled={isEndingRoom}
                        className="flex items-center gap-2"
                      >
                        {isEndingRoom ? (
                          <>
                            <Loader2 size={16} className="animate-spin" />
                            Ending Room...
                          </>
                        ) : (
                          <>
                            <LogOut size={16} />
                            End Room
                          </>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Tab Navigation */}
            <div className="flex gap-1 sm:gap-2 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg text-xs sm:text-sm">
              <button
                onClick={() => setActiveTab('manual')}
                className={`flex-1 px-2 sm:px-4 py-1.5 sm:py-2 rounded-md font-medium transition-colors ${activeTab === 'manual'
                  ? 'bg-white text-purple-600 shadow-sm dark:bg-gray-700 dark:text-purple-400'
                  : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200'
                  }`}
              >
                Manual Entry
              </button>
              <button
                onClick={() => setActiveTab('genai')}
                className={`flex-1 px-2 sm:px-4 py-1.5 sm:py-2 rounded-md font-medium transition-colors flex items-center justify-center gap-1 sm:gap-2 ${activeTab === 'genai'
                  ? 'bg-white text-purple-600 shadow-sm dark:bg-gray-700 dark:text-purple-400'
                  : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200'
                  }`}
              >
                <Wand2 size={16} />
                AI Generate
              </button>
            </div>

            {/* Manual Entry Tab */}
            {activeTab === 'manual' && (
              <div className="space-y-4 sm:space-y-6">
                <div>
                  <Input
                    placeholder="Poll question"
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    className="dark:bg-gray-800/50 text-xs sm:text-base"
                  />
                </div>

                <fieldset className="space-y-3">
                  <legend className="text-sm font-medium text-gray-600 mb-2 dark:text-gray-400">
                    Select correct option
                  </legend>
                  {options.map((opt, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <Input
                        type="radio"
                        name="correctOption"
                        checked={correctOptionIndex === i}
                        onChange={() => setCorrectOptionIndex(i)}
                        className="h-4 w-4 sm:h-5 sm:w-5 accent-purple-600 dark:accent-purple-400"
                      />
                      <Input
                        placeholder={`Option ${i + 1}`}
                        value={opt}
                        onChange={(e) => {
                          const copy = [...options];
                          copy[i] = e.target.value;
                          setOptions(copy);
                        }}
                        className="dark:bg-gray-800/50 text-xs sm:text-base"
                      />
                    </div>
                  ))}
                </fieldset>

                <div>
                  <Input
                    type="number"
                    placeholder="Timer (seconds)"
                    value={timer}
                    min={5}
                    onChange={(e) => setTimer(Number(e.target.value))}
                    className="dark:bg-gray-800/50 text-xs sm:text-base"
                  />
                </div>

                <div className="flex flex-col xs:flex-row gap-2 sm:gap-4">
                  <Button
                    onClick={createPoll}
                    disabled={!question || options.filter(opt => opt.trim()).length < 2}
                    className="bg-gradient-to-r from-purple-500 to-blue-500 text-white hover:from-purple-600 hover:to-blue-600 flex-1 text-xs sm:text-base"
                  >
                    Create Poll
                  </Button>
                  <Button
                    variant="outline"
                    onClick={fetchResults}
                    className="flex-1 border-purple-500 text-purple-600 hover:bg-purple-50 hover:text-purple-700 dark:border-purple-400 dark:text-purple-300 dark:hover:bg-purple-900/30 text-xs sm:text-base"
                  >
                    Fetch Results
                  </Button>
                </div>
              </div>
            )}

            {/* GenAI Tab */}
            {activeTab === 'genai' && (
              <div className="space-y-4 sm:space-y-6">
                {!showPreview ? (
                  <>
                    {/* YouTube URL Input */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-600 dark:text-gray-400 flex items-center gap-2">
                        <Youtube size={16} />
                        YouTube URL
                      </label>
                      <Input
                        placeholder="https://www.youtube.com/watch?v=..."
                        value={youtubeUrl}
                        onChange={(e) => setYoutubeUrl(e.target.value)}
                        className="dark:bg-gray-800/50 text-xs sm:text-base"
                      />
                    </div>

                    <div className="text-center text-sm text-gray-500 dark:text-gray-400 font-medium">OR</div>

                    {/* File Upload */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-600 dark:text-gray-400 flex items-center gap-2">
                        <Upload size={16} />
                        Upload Audio/Video File
                      </label>
                      <div className="flex items-center gap-2">
                        <Input
                          type="file"
                          accept="audio/*,video/*"
                          onChange={handleFileUpload}
                          ref={fileInputRef}
                          className="dark:bg-gray-800/50 text-xs sm:text-base"
                        />
                        {audioFile && (
                          <span className="text-sm text-green-600 dark:text-green-400 font-medium">
                            {audioFile.name}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="text-center text-sm text-gray-500 dark:text-gray-400 font-medium">OR</div>

                    {/* Audio Recording */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-600 dark:text-gray-400 flex items-center gap-2">
                        <Mic size={16} />
                        Record Audio
                      </label>
                      <div className="flex items-center gap-2">
                        <Button
                          onClick={isRecording ? stopRecording : startRecording}
                          variant={isRecording ? "destructive" : "outline"}
                          className="flex items-center gap-1 sm:gap-2 text-xs sm:text-base"
                        >
                          {isRecording ? <MicOff size={16} /> : <Mic size={16} />}
                          {isRecording ? "Stop Recording" : "Start Recording"}
                        </Button>
                        {recordedAudio && (
                          <span className="text-xs sm:text-sm text-green-600 dark:text-green-400 font-medium">
                            Recording ready
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Optional Configuration */}
                    <div className="border-t pt-4 space-y-4">
                      <h4 className="text-sm font-medium text-gray-600 dark:text-gray-400">Optional Settings</h4>

                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-600 dark:text-gray-400">
                          Question Specification (optional)
                        </label>
                        <Input
                          placeholder="e.g., Focus on key concepts, multiple choice only"
                          value={questionSpec}
                          onChange={(e) => setQuestionSpec(e.target.value)}
                          className="dark:bg-gray-800/50 text-xs sm:text-base"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-600 dark:text-gray-400">
                          AI Model
                        </label>
                        <select
                          value={selectedModel}
                          onChange={(e) => setSelectedModel(e.target.value)}
                          className="w-full px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-gray-800/50 dark:border-gray-600 dark:text-white text-xs sm:text-base"
                          aria-label="AI Model"
                        >
                          <option value="gemma3">Gemma 3</option>
                          <option value="gpt-4">GPT-4</option>
                          <option value="claude-3">Claude 3</option>
                        </select>
                      </div>
                    </div>

                    <div className="flex flex-col xs:flex-row gap-2 sm:gap-4">
                      <Button
                        onClick={generateQuestions}
                        disabled={isGenerating || (!youtubeUrl && !audioFile && !recordedAudio)}
                        className="bg-gradient-to-r from-purple-500 to-blue-500 text-white hover:from-purple-600 hover:to-blue-600 flex-1 flex items-center gap-1 sm:gap-2 text-xs sm:text-base"
                      >
                        {isGenerating ? (
                          <>
                            <Loader2 size={16} className="animate-spin" />
                            Generating...
                          </>
                        ) : (
                          <>
                            <Wand2 size={16} />
                            Generate Questions
                          </>
                        )}
                      </Button>
                      <Button
                        onClick={clearGenAIData}
                        variant="outline"
                        className="border-gray-300 text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-800 text-xs sm:text-base"
                      >
                        Clear
                      </Button>
                    </div>
                  </>
                ) : (
                  /* Generated Questions Preview */
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-base sm:text-lg font-semibold text-gray-800 dark:text-gray-200">
                        Generated Questions Preview ({generatedQuestions.length})
                      </h3>
                      <Button
                        onClick={() => setShowPreview(false)}
                        variant="ghost"
                        size="sm"
                        className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-xs sm:text-sm"
                      >
                        <X size={16} />
                      </Button>
                    </div>

                    <div className="space-y-3 sm:space-y-4 max-h-80 sm:max-h-96 overflow-y-auto">
                      {generatedQuestions.map((questionData, index) => (
                        <Card key={index} className="bg-white/80 dark:bg-gray-800/80 border border-slate-200/70 dark:border-gray-700/70">
                          <CardContent className="p-3 sm:p-4">
                            <div className="space-y-2 sm:space-y-3">
                              <div className="flex items-start gap-1 sm:gap-2">
                                <Button
                                  onClick={() => setEditingQuestionIndex(editingQuestionIndex === index ? null : index)}
                                  variant="ghost"
                                  size="sm"
                                  className="text-purple-600 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300 text-xs sm:text-sm"
                                >
                                  <Edit3 size={14} />
                                </Button>
                                <Button
                                  onClick={() => deleteGeneratedQuestion(index)}
                                  variant="ghost"
                                  size="sm"
                                  className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 text-xs sm:text-sm"
                                  title="Delete question"
                                >
                                  <X size={14} />
                                </Button>
                                {editingQuestionIndex === index ? (
                                  <Input
                                    value={questionData.question}
                                    onChange={(e) => editGeneratedQuestion(index, 'question', e.target.value)}
                                    className="flex-1 dark:bg-gray-700/50 text-xs sm:text-base"
                                  />
                                ) : (
                                  <p className="flex-1 font-medium text-gray-800 dark:text-gray-200 text-xs sm:text-base">
                                    {questionData.question}
                                  </p>
                                )}
                              </div>

                              <div className="space-y-1 sm:space-y-2">
                                {(questionData.options ?? []).map((option, optionIndex) => (
                                  <div key={optionIndex} className="flex items-center gap-1 sm:gap-2">
                                    <Input
                                      type="radio"
                                      name={`correct-${index}`}
                                      checked={questionData.correctOptionIndex === optionIndex}
                                      onChange={() => editGeneratedQuestion(index, 'correctOptionIndex', optionIndex)}
                                      className="h-3 w-3 sm:h-4 sm:w-4 accent-purple-600 dark:accent-purple-400"
                                    />
                                    {editingQuestionIndex === index ? (
                                      <Input
                                        value={option}
                                        onChange={(e) => editGeneratedQuestion(index, `option-${optionIndex}`, e.target.value)}
                                        className="flex-1 dark:bg-gray-700/50 text-xs sm:text-base"
                                        placeholder={`Option ${optionIndex + 1}`}
                                      />
                                    ) : (
                                      <span className={`flex-1 text-xs sm:text-base ${questionData.correctOptionIndex === optionIndex
                                        ? 'text-green-600 dark:text-green-400 font-medium'
                                        : 'text-gray-700 dark:text-gray-300'
                                        } ${!option.trim() ? 'italic text-gray-400 dark:text-gray-500' : ''}`}>
                                        {option.trim() || `Option ${optionIndex + 1} (empty)`}
                                      </span>
                                    )}
                                  </div>
                                ))}
                              </div>

                              <Button
                                onClick={() => selectGeneratedQuestion(questionData)}
                                variant="outline"
                                size="sm"
                                className="w-full border-purple-500 text-purple-600 hover:bg-purple-50 hover:text-purple-700 dark:border-purple-400 dark:text-purple-300 dark:hover:bg-purple-900/30 text-xs sm:text-base"
                              >
                                Use This Question
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Poll Results */}
            {Object.keys(pollResults).length > 0 && (
              <div className="space-y-4 mt-6">
                <h3 className="text-base sm:text-lg font-semibold text-gray-800 dark:text-gray-200">
                  Poll Results
                </h3>
                {Object.entries(pollResults ?? {}).map(([pollQuestion, options]) => (
                  <Card
                    key={pollQuestion}
                    className="bg-white/80 dark:bg-gray-800/80 border border-slate-200/70 dark:border-gray-700/70"
                  >
                    <CardHeader>
                      <CardTitle className="text-xs sm:text-lg text-gray-800 dark:text-gray-200">
                        {pollQuestion}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-1 sm:space-y-2">
                        {Object.entries(options ?? {}).map(([opt, data]) => (
                          <li key={opt} className="flex items-baseline">
                            <span className="font-medium text-purple-600 dark:text-purple-400 mr-1 sm:mr-2 text-xs sm:text-base">
                              {opt}:
                            </span>
                            <span className="text-gray-700 dark:text-gray-300 mr-1 sm:mr-2 text-xs sm:text-base">
                              {data.count} votes
                            </span>
                            {data.users.length > 0 && (
                              <span className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">
                                ({data.users.join(", ")})
                              </span>
                            )}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}