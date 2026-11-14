import { Button } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import SearchOffIcon from '@mui/icons-material/SearchOff';
import { EmptyState } from '@/components/States';

export default function NotFoundPage() {
  return (
    <EmptyState
      icon={<SearchOffIcon />}
      title="Page not found"
      message="The page you're looking for doesn't exist or has been moved."
      action={
        <Button variant="contained" component={RouterLink} to="/" sx={{ mt: 1 }}>
          Back to dashboard
        </Button>
      }
    />
  );
}
