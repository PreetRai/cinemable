// src/pages/Profile.js
const Profile = () => {
    const { user } = useAuth();
    const [watchlist, setWatchlist] = useState([]);
  
    useEffect(() => {
      const fetchWatchlist = async () => {
        const userRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userRef);
        setWatchlist(userDoc.data().watchlist || []);
      };
      fetchWatchlist();
    }, [user]);
  
    return (
      <div className="min-h-screen bg-[#353535] text-white">
        <div className="container mx-auto px-4 py-8">
          <h1 className="text-3xl font-bold mb-8">Profile</h1>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-[#1a1a1a] p-6 rounded-lg">
              <h2 className="text-xl font-bold mb-4">My Information</h2>
              <p>Email: {user.email}</p>
              <p>Name: {user.displayName}</p>
            </div>
            <div className="bg-[#1a1a1a] p-6 rounded-lg">
              <h2 className="text-xl font-bold mb-4">My Watchlist</h2>
              {watchlist.map((item) => (
                <MovieCard key={item.movieId} movieId={item.movieId} />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };
  