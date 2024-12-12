import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Grid,
  Card,
  CardContent,
  CardMedia,
  Typography,
  Button,
  Box,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
} from '@mui/material';
import axios from 'axios';

export default function WorkspaceList() {
  const [workspaces, setWorkspaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({
    type: 'all',
    capacity: 'all',
    search: '',
  });
  const navigate = useNavigate();

  useEffect(() => {
    const fetchWorkspaces = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get('http://localhost:5000/api/workspaces', {
          headers: { Authorization: `Bearer ${token}` },
        });
        setWorkspaces(response.data);
      } catch (error) {
        console.error('Error fetching workspaces:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchWorkspaces();
  }, []);

  const handleFilterChange = (event) => {
    setFilter({
      ...filter,
      [event.target.name]: event.target.value,
    });
  };

  const filteredWorkspaces = workspaces.filter((workspace) => {
    const matchesType =
      filter.type === 'all' || workspace.type === filter.type;
    const matchesCapacity =
      filter.capacity === 'all' ||
      (filter.capacity === '1-4' && workspace.capacity <= 4) ||
      (filter.capacity === '5-8' && workspace.capacity > 4 && workspace.capacity <= 8) ||
      (filter.capacity === '9+' && workspace.capacity > 8);
    const matchesSearch =
      workspace.name.toLowerCase().includes(filter.search.toLowerCase()) ||
      workspace.description.toLowerCase().includes(filter.search.toLowerCase());

    return matchesType && matchesCapacity && matchesSearch;
  });

  if (loading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="60vh"
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Available Workspaces
      </Typography>

      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={4}>
          <FormControl fullWidth>
            <InputLabel>Type</InputLabel>
            <Select
              name="type"
              value={filter.type}
              label="Type"
              onChange={handleFilterChange}
            >
              <MenuItem value="all">All Types</MenuItem>
              <MenuItem value="desk">Desk</MenuItem>
              <MenuItem value="office">Office</MenuItem>
              <MenuItem value="meeting_room">Meeting Room</MenuItem>
              <MenuItem value="conference_room">Conference Room</MenuItem>
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} sm={4}>
          <FormControl fullWidth>
            <InputLabel>Capacity</InputLabel>
            <Select
              name="capacity"
              value={filter.capacity}
              label="Capacity"
              onChange={handleFilterChange}
            >
              <MenuItem value="all">All Sizes</MenuItem>
              <MenuItem value="1-4">1-4 People</MenuItem>
              <MenuItem value="5-8">5-8 People</MenuItem>
              <MenuItem value="9+">9+ People</MenuItem>
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} sm={4}>
          <TextField
            fullWidth
            label="Search"
            name="search"
            value={filter.search}
            onChange={handleFilterChange}
          />
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        {filteredWorkspaces.map((workspace) => (
          <Grid item xs={12} sm={6} md={4} key={workspace.id}>
            <Card>
              <CardMedia
                component="img"
                height="200"
                image={workspace.imageUrl || 'https://via.placeholder.com/300x200'}
                alt={workspace.name}
              />
              <CardContent>
                <Typography gutterBottom variant="h5" component="div">
                  {workspace.name}
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  {workspace.description}
                </Typography>
                <Typography variant="body2" color="text.primary">
                  Type: {workspace.type}
                </Typography>
                <Typography variant="body2" color="text.primary">
                  Capacity: {workspace.capacity} people
                </Typography>
                <Typography variant="body2" color="text.primary" gutterBottom>
                  Rate: ${workspace.hourlyRate}/hour
                </Typography>
                <Button
                  variant="contained"
                  fullWidth
                  onClick={() => navigate(`/book/${workspace.id}`)}
                >
                  Book Now
                </Button>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}
