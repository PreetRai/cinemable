import axios from 'axios';

const API_KEY = process.env.REACT_APP_OMDb_API;
const BASE_URL = 'https://www.omdbapi.com';

export const searchMovies = async (query, type = 'movie') => {
  try {
    let url;
    
    // If the query is 'popular', use predefined list
    if (query === 'popular') {
      const popularTitles = type === 'movie' 
        ? ['Inception', 'The Shawshank Redemption', 'The Godfather', 'Pulp Fiction']
        : ['Breaking Bad', 'Game of Thrones', 'Stranger Things', 'The Crown'];
      query = popularTitles[Math.floor(Math.random() * popularTitles.length)];
    }

    // Use 't' parameter for detailed information
    url = `${BASE_URL}?apikey=${API_KEY}&t=${query}&type=${type}&plot=full`;

    const response = await axios.get(url);
    
    // Return an array with single item to maintain compatibility with existing code
    return {
      Search: response.data.Response === "True" ? [response.data] : []
    };
  } catch (error) {
    console.error('Error searching movies:', error);
    return null;
  }
};

// Add a new function for searching multiple movies
export const searchMultipleMovies = async (query, type = 'movie') => {
  try {
    const url = `${BASE_URL}?apikey=${API_KEY}&s=${query}&type=${type}`;
    const response = await axios.get(url);
    return response.data;
  } catch (error) {
    console.error('Error searching movies:', error);
    return null;
  }
};
export const getMovieById = async (imdbId) => {
  try {
    const url = `${BASE_URL}?apikey=${API_KEY}&i=${imdbId}&plot=full`;
    const response = await axios.get(url);
    return response.data;
  } catch (error) {
    console.error('Error fetching movie details:', error);
    return null;
  }
};