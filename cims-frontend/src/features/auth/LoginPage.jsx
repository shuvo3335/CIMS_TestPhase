import { useState } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate, useLocation } from 'react-router-dom';
import { Box, Card, CardContent, Typography, Button, Stack, Alert, IconButton, InputAdornment, alpha } from '@mui/material';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import VisibilityOffOutlinedIcon from '@mui/icons-material/VisibilityOffOutlined';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import { RHFText } from '@/components/form/RHFFields';
import { api } from '@/services/api';
import { useAuthStore } from '@/store/authStore';
import { BRAND } from '@/theme/theme';

const schema = z.object({
  userId: z.string().trim().min(1, 'User ID is required'),
  password: z.string().min(1, 'Password is required'),
});

export default function LoginPage() {
  const methods = useForm({ resolver: zodResolver(schema), defaultValues: { userId: '', password: '' } });
  const [error, setError] = useState('');
  const [show, setShow] = useState(false);
  const login = useAuthStore((s) => s.login);
  const navigate = useNavigate();
  const location = useLocation();

  const onSubmit = methods.handleSubmit(async (values) => {
    setError('');
    try {
      login(await api.auth.login(values));
      navigate(location.state?.from || '/', { replace: true });
    } catch (e) {
      setError(e.message);
    }
  });

  return (
    <Box sx={{ minHeight: '100vh', display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr' }, bgcolor: 'background.default' }}>
      {/* <Box
        sx={{
          display: { xs: 'none', md: 'flex' },
          flexDirection: 'column',
          justifyContent: 'space-between',
          p: 6,
          color: '#fff',
          background: `radial-gradient(circle at 20% 20%, ${alpha(BRAND.teal, 0.35)}, transparent 45%), linear-gradient(135deg, ${BRAND.navy} 0%, #123764 100%)`,
        }}
      >
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Box component="img" src="/favicon.svg" alt="" sx={{ width: 40, height: 40 }} />
          <Typography variant="h6" fontWeight={800}>
            CIMS
          </Typography>
        </Stack>
        <Box sx={{ maxWidth: 520 }}>
          <Typography variant="h3" fontWeight={800} lineHeight={1.15} sx={{ mb: 2 }}>
            Contract & Import
            <br />
            Management System
          </Typography>
          <Typography sx={{ opacity: 0.8, fontSize: 17 }}>
            Track every import from sales contract to discharge: PI &amp; SPI, LCs and amendments, vessels, BL &amp; CI, all in one vessel-wise view.
          </Typography>
        </Box>
        <Typography variant="caption" sx={{ opacity: 0.6 }}>
          © {new Date().getFullYear()} {import.meta.env.VITE_COMPANY_NAME}
        </Typography>
      </Box> */}

      <Box sx={{ display: 'grid', placeItems: 'center'}}>
        
        <Card sx={{ width: '100%', maxWidth: 420, pt:3 }}>
          <Stack direction="row" spacing={1.5} alignItems="center" justifyContent="center">
            <Box component="img" src="/favicon.svg" alt="" sx={{ width: 60, height: 60 }} />
            <Typography variant="h6" fontWeight={800}>
              CIMS
            </Typography>
          </Stack>
          <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
            <Typography variant="h5" sx={{ mb: 0.5 }}>
              Sign in
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Use the User ID and password provided by your administrator.
            </Typography>
            <FormProvider {...methods}>
              <Stack component="form" spacing={2.25} onSubmit={onSubmit} noValidate>
                {error && <Alert severity="error">{error}</Alert>}
                <RHFText name="userId" label="User ID" autoFocus autoComplete="username" startAdornment={<PersonOutlineIcon fontSize="small" />} size="medium" />
                <RHFText
                  name="password"
                  label="Password"
                  type={show ? 'text' : 'password'}
                  autoComplete="current-password"
                  size="medium"
                  startAdornment={<LockOutlinedIcon fontSize="small" />}
                  slotProps={{
                    input: {
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton size="small" onClick={() => setShow((s) => !s)} aria-label="Toggle password visibility">
                            {show ? <VisibilityOffOutlinedIcon fontSize="small" /> : <VisibilityOutlinedIcon fontSize="small" />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    },
                  }}
                />
                <Button type="submit" variant="contained" size="large" disabled={methods.formState.isSubmitting}>
                  {methods.formState.isSubmitting ? 'Signing in…' : 'Sign in'}
                </Button>
                <Alert severity="info" variant="outlined" sx={{ fontSize: 13 }}>
                  Demo accounts: <b>admin / admin123</b> (System Admin) · <b>user / user123</b> (User)
                </Alert>
              </Stack>
            </FormProvider>
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
}
