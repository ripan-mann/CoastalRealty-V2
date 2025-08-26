import React, { useEffect, useState } from 'react';
import { Box, Paper, Typography, Chip, Stack, Divider, CircularProgress } from '@mui/material';
import { API_BASE } from '../../config';

const Check = ({ label, ok, detail }) => (
  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', py: 1 }}>
    <Typography variant="body1">{label}</Typography>
    <Stack direction="row" spacing={1} alignItems="center">
      <Chip size="small" label={ok ? 'OK' : 'FAIL'} color={ok ? 'success' : 'error'} />
      {detail && <Typography variant="caption" color="text.secondary">{detail}</Typography>}
    </Stack>
  </Box>
);

export default function Status() {
  const [loading, setLoading] = useState(true);
  const [health, setHealth] = useState(null);
  const [settingsOk, setSettingsOk] = useState(null);
  const [seasonalOk, setSeasonalOk] = useState(null);
  const [newsOk, setNewsOk] = useState(null);

  useEffect(() => {
    const base = API_BASE || '';
    const run = async () => {
      try {
        const h = await fetch(`${base}/api/health`).then(r => r.ok ? r.json() : Promise.reject(new Error(`health ${r.status}`)));
        setHealth(h);
      } catch (e) {
        setHealth(null);
      }
      try {
        const s = await fetch(`${base}/api/settings/display`).then(r => r.ok ? r.json() : Promise.reject(new Error(`settings ${r.status}`)));
        setSettingsOk(!!s && typeof s === 'object');
      } catch (_) {
        setSettingsOk(false);
      }
      try {
        const si = await fetch(`${base}/api/seasonal/images?t=${Date.now()}`).then(r => r.ok ? r.json() : Promise.reject(new Error(`seasonal ${r.status}`)));
        setSeasonalOk(Array.isArray(si));
      } catch (_) {
        setSeasonalOk(false);
      }
      try {
        const r = await fetch(`${base}/api/news?count=1`);
        setNewsOk(r.ok);
      } catch (_) {
        setNewsOk(false);
      }
      setLoading(false);
    };
    run();
  }, []);

  if (loading) {
    return (
      <Box sx={{ p: 3, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress size={24} />
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, display: 'flex', justifyContent: 'center' }}>
      <Paper variant="outlined" sx={{ p: { xs: 2, md: 3 }, borderRadius: 3, maxWidth: 720, width: '100%' }}>
        <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>System Status</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Internal diagnostics for Coastal Realty display. Not linked in the UI.
        </Typography>
        <Divider sx={{ mb: 2 }} />

        <Check label="API reachable (/api/health)" ok={!!health} detail={health ? `${health.env} • ${health.now}` : undefined} />
        <Check label="DB connected" ok={!!(health && health.db && health.db.connected)} detail={health && health.db ? `state=${health.db.state}` : undefined} />
        <Check label="Cloudinary configured" ok={!!(health && health.cloudinary && health.cloudinary.configured)} detail={health && health.cloudinary ? `ping=${String(health.cloudinary.ping)}` : undefined} />
        <Check label="Display settings" ok={settingsOk === true} />
        <Check label="Seasonal images list" ok={seasonalOk === true} detail={health && health.seasonal && Number.isFinite(health.seasonal.count) ? `count=${health.seasonal.count}` : undefined} />
        <Check label="News feed endpoint" ok={newsOk === true} />

        {health && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="caption" color="text.secondary">
              Uptime: {health.uptimeSec}s
            </Typography>
          </Box>
        )}
      </Paper>
    </Box>
  );
}

