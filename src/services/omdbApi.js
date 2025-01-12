import axios from 'axios';

// Add a new function for searching multiple movies
export const searchMultipleMovies = async (searchTerm, options = {}) => {
  const { type, year, page = 1 } = options;
  const params = new URLSearchParams({
    apikey: process.env.REACT_APP_OMDb_API,
    s: searchTerm,
    page: page.toString()
  });

  if (type) params.append('type', type);
  if (year) params.append('y', year);

  const response = await fetch(`https://www.omdbapi.com/?${params}`);
  return response.json();
};

export const getMovieById = async (imdbId) => {
  const params = new URLSearchParams({
    apikey: process.env.REACT_APP_OMDb_API,
    i:imdbId,
    plot:'full'
  });
  try {
    const url = `https://www.omdbapi.com/?${params}`;
    const response = await axios.get(url);
    return response.data;
  } catch (error) {
    console.error('Error fetching movie details:', error);
    return null;
  }
};