import React, { useEffect, useState } from 'react';
import './App.css';
import Plot from 'react-plotly.js'
import Button from '@mui/material/Button';
import CircularProgress  from '@mui/material/CircularProgress';
import Stack from '@mui/system/Stack';
const baseURL = 'https://75xtipvj56.execute-api.us-east-1.amazonaws.com';

function App() {
  const [scanX, setScanX] = React.useState(0);
  const [waveformx, setWaveformx] = useState<number[]>([]);
  const [waveformy, setWaveformy] = useState<number[]>([]);
  const [duration, setDuration] = useState<number>(0);
  const [aud, setAud] = useState<HTMLAudioElement>(new Audio());
  const [playing, setPlaying] = useState(false);
  const [waveformMax, setWaveformMax] = useState<number>(0);
  const [waveformMin, setWaveformMin] = useState<number>(0);

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

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    const patientID = params.get('patientID');
    const startTime = params.get('startTime');
    const password = params.get('password');

    const url = `${baseURL}/?patientID=${patientID}&startTime=${startTime}&password=${password}&dataType=`;
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

      getWaveform(`${url}ecg`).then((data) => {
        const time = tempaud.duration;
        const x = Array.from(Array(data.length).keys()).map((i) => i * time / data.length);
        setWaveformx(x);
        setWaveformy(Array.prototype.slice.call(data));
        setWaveformMax(Math.max(...data));
        setWaveformMin(Math.min(...data));
        setDuration(time);
      })

    });
  }, []);

  return (
    <div>
      <Stack alignItems="center" spacing={2}>
        <div>
          {duration ? (
            <Plot
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
              layout={{ title: 'ECG Data', showlegend: false }}
            />
          ) :
            <Stack alignItems="center" spacing={2}>
              <h2>Loading Content...</h2>
              <CircularProgress />
            </Stack>
          }
        </div>
        <Stack direction="row" spacing={2} >
          <Button variant='contained' onClick={playpause} disabled={!duration}>Play / Pause</Button>
          <Button variant='contained' onClick={restart} disabled={!duration}>Restart</Button>
        </Stack>
      </Stack>

    </div>
  );
}

export default App;