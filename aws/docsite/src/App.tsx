import React, { useEffect, useState } from 'react';
import './App.css';
import Plot from 'react-plotly.js'
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Stack from '@mui/system/Stack';
import { Alert, AlertTitle, MenuItem, Select, SelectChangeEvent, Table, TableCell, TableContainer, TableHead, TableRow, TableBody, Paper } from '@mui/material';
const baseURL = 'https://75xtipvj56.execute-api.us-east-1.amazonaws.com';

function BeatsTable(data: number[][]) {
  return (
    <TableContainer>
      <Table aria-label="simple table">
        <TableHead>
          <TableRow>
            <TableCell>Beats</TableCell>
            <TableCell align="right">P(Normal)</TableCell>
            <TableCell align="right">P(2)</TableCell>
            <TableCell align="right">P(3)</TableCell>
            <TableCell align="right">P(4)</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {data.map((row, idx) => (
            <TableRow
              key={"Beat " + idx}
              sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
            >
              <TableCell component="th" scope="row">
                {"Beat " + idx}
              </TableCell>
              <TableCell align="right">{row[0].toFixed(3)}</TableCell>
              <TableCell align="right">{row[1].toFixed(3)}</TableCell>
              <TableCell align="right">{row[2].toFixed(3)}</TableCell>
              <TableCell align="right">{row[3].toFixed(3)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

function App() {
  const [scanX, setScanX] = React.useState(0);
  const [waveformx, setWaveformx] = useState<number[]>([]);
  const [waveformy, setWaveformy] = useState<number[]>([]);
  const [duration, setDuration] = useState<number>(0);
  const [aud, setAud] = useState<HTMLAudioElement>(new Audio());
  const [playing, setPlaying] = useState(false);
  const [waveformMax, setWaveformMax] = useState<number>(0);
  const [waveformMin, setWaveformMin] = useState<number>(0);
  const [location, setLocation] = useState<string>('unknown');
  const [screenResults, setScreenResults] = useState<number[][]>([[]]);

  const [loaded, setLoaded] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  const playpause = async () => {
    if (playing) {
      aud.pause();
      setPlaying(false);
    } else {
      aud.play();
      setPlaying(true);

      while (!aud.paused) {
        const pct = aud.currentTime / duration;
        setScanX(duration * pct);
        await new Promise(r => setTimeout(r, 25));
      }
      const pct = aud.currentTime / duration;
      setScanX(duration * pct);

      setPlaying(false);
    }
  }

  const restart = () => {
    aud.currentTime = 0;
    setScanX(0);
    if (!playing) {
      playpause();
    }
  }

  const handleChange = (event: SelectChangeEvent) => {
    setLocation(event.target.value);
  };


  useEffect(() => {
    reloadData();
  }, [location]);

  function reloadData() {
    setLoaded(false);
    setErrorMessage('');
    aud.pause();
    const params = new URLSearchParams(window.location.search);

    let patientID = params.get('patientID');
    let startTime = params.get('startTime');
    let password = params.get('password');

    if (!process.env.NODE_ENV || process.env.NODE_ENV === 'development') {
      console.log('development')
      patientID = 'drew';
      startTime = '1678929332854';
      password = 'gokies';
    }

    const url = `${baseURL}/?patientID=${patientID}&stethoscopeLocation=${location}&startTime=${startTime}&password=${password}&dataType=`;

    const tempaud = new Audio(`${url}audio`);
    setAud(tempaud);

    tempaud.addEventListener('loadedmetadata', () => {
      const getWaveform = (url: string): Promise<number[]> => {
        return fetch(url)
          .then(response => response.arrayBuffer())
          .then(arrayBuffer => {
            const decoder = new TextDecoder();
            const str = decoder.decode(arrayBuffer);
            return str.split('\n').map(Number);
          });
      }

      const getMetadata = (url: string): Promise<string> => {
        return fetch(url)
          .then(response => response.arrayBuffer())
          .then(arrayBuffer => {
            const decoder = new TextDecoder();
            const str = decoder.decode(arrayBuffer);
            return str;
          });
      };

      Promise.all([getWaveform(`${url}ecg`), getMetadata(`${url}meta`)]).then((data) => {
        const [ecgdata, metadata] = data;

        const time = tempaud.duration;
        const x = Array.from(Array(ecgdata.length).keys()).map((i) => i * time / ecgdata.length);
        setWaveformx(x);
        setWaveformy(Array.prototype.slice.call(ecgdata));
        setWaveformMax(Math.max(...ecgdata));
        setWaveformMin(Math.min(...ecgdata));
        setDuration(time);
        setLoaded(true);
        setErrorMessage('');

        setScreenResults(JSON.parse(metadata).screenResults.predictions);
      })
    });

    tempaud.addEventListener('error', () => {
      setErrorMessage(tempaud.error?.message as string);
      setLoaded(true);
    });
  }

  function getContent() {
    if (errorMessage) {
      return <Alert severity='error'>
        <AlertTitle>Error: No data found</AlertTitle>
        Error Message: {errorMessage}
      </Alert>
    }
    else {
      if (loaded) {
        return <><Plot
          data={[
            {
              x: waveformx,
              y: waveformy,
              type: 'scatter',
              mode: 'lines',
              marker: { color: 'red' },
            },
            {
              x: [scanX, scanX],
              y: [waveformMin, waveformMax],
              type: 'scatter',
              mode: 'lines',
              marker: { color: 'blue' },
            },
          ]}
          layout={{ title: 'ECG Data', showlegend: false}}
        />
          {BeatsTable(screenResults)}
        </>
      }
      else {
        return <Stack alignItems="center" spacing={2}>
          <h3>Loading Content...</h3>
          <CircularProgress />
        </Stack>
      }
    }
  }


  return (
    <div>
      <Stack alignItems="center" spacing={2}>
        <h2>Heartbeat Review Portal</h2>
        <div style={{ padding: "1em" }}>
          <Stack direction="row" alignItems="center">
            {getContent()}
          </Stack>
        </div>
        <Stack direction="row" spacing={2} >
          <Button variant='contained' onClick={playpause} disabled={!loaded || !!errorMessage}>Play / Pause</Button>
          <Button variant='contained' onClick={restart} disabled={!loaded || !!errorMessage}>Restart</Button>
          <Select value={location} disabled={!loaded} onChange={handleChange} label="">
            <MenuItem value="aortic">Aortic</MenuItem>
            <MenuItem value="mitral">Mitral</MenuItem>
            <MenuItem value="tricuspid">Tricuspid</MenuItem>
            <MenuItem value="pulmonic">Pulmonic</MenuItem>
            <MenuItem value="unknown">Unknown</MenuItem>
          </Select>

        </Stack>
      </Stack >

    </div >
  );
}

export default App;