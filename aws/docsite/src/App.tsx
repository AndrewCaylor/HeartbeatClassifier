import React, { useEffect, useState } from 'react';
import './App.css';
import Plot from 'react-plotly.js'
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Stack from '@mui/system/Stack';
import { Alert, AlertTitle, MenuItem, Select, SelectChangeEvent, Table, TableCell, TableContainer, TableHead, TableRow, TableBody, Paper, FormHelperText } from '@mui/material';
const baseURL = 'https://75xtipvj56.execute-api.us-east-1.amazonaws.com';

interface MLRes {
  ST: number[],
  CD: number[],
  H: number[],
  MI: number[],
}

function BeatsTable(data: MLRes) {
  if (!(data.ST || data.CD || data.H || data.MI)) {
    return <Alert severity='error'>
      <AlertTitle>Error: No data found</AlertTitle>
      Error Message: No results for this recording
    </Alert>;
  }

  // format the stupid data from the backend into something usable
  const columns: number[][] = [data.ST, data.CD, data.H, data.MI];

  // convert the columns to rows
  const rows: number[][] = [];
  for (let i = 0; i < columns[0].length; i++) {
    rows.push([columns[0][i], columns[1][i], columns[2][i], columns[3][i]]);
  }

  return (
    <TableContainer>
      <Table aria-label="simple table">
        <TableHead>
          <TableRow>
            <TableCell>Beat #</TableCell>
            <TableCell align="right">ST</TableCell>
            <TableCell align="right">CD</TableCell>
            <TableCell align="right">H</TableCell>
            <TableCell align="right">MI</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((row, idx) => (
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
  const [screenResults, setScreenResults] = useState<MLRes>({} as MLRes);

  const [beatStarts, setBeatStarts] = useState<number[]>([]);

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

    // TODO: probably don't give the master password to client device in plaintext lol
    if (!process.env.NODE_ENV || process.env.NODE_ENV === 'development') {
      console.log('development')
      patientID = 'drew';
      startTime = '235463456';
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

      Promise.allSettled([getWaveform(`${url}ecg`), getMetadata(`${url}meta`)]).then((data) => {
        const [ecgres, metares] = data;

        // handle ECG stuff
        if (ecgres.status === 'rejected') {
          setErrorMessage(ecgres.reason);
          setLoaded(true);
          return;
        }
        const ecgdata = ecgres.value;

        const time = tempaud.duration;
        const x = Array.from(Array(ecgdata.length).keys()).map((i) => i * time / ecgdata.length);
        setWaveformx(x);
        setWaveformy(Array.prototype.slice.call(ecgdata));
        setWaveformMax(Math.max(...ecgdata));
        setWaveformMin(Math.min(...ecgdata));
        setDuration(time);
        setLoaded(true);
        setErrorMessage('');

        console.log(metares)
        // handle metadata stuff, if it exists
        // we still want to see the ECG even if the metadata is missing
        try {
          if (metares.status === 'rejected') {
            setScreenResults({} as MLRes);
            setBeatStarts([]);
            return;
          }
          const metadata = JSON.parse(metares.value);
          setScreenResults(metadata.screenResults);
          setBeatStarts(metadata.beatLocations);
        }
        catch (e) {
          console.log("error parsing metadata: " + e)
          // sometimes the metares will succeed but the JSON.parse will fail
          setScreenResults({} as MLRes);
          setBeatStarts([]);
        }
      });
    });

    tempaud.addEventListener('error', () => {
      console.log(tempaud.error);
      setErrorMessage(tempaud.error?.message as string);
      setLoaded(true);
    });
  }

  function getContent() {
    let end = true;

    const startsList: object[] = beatStarts.map((x) => {
      end = !end
      return {
        x: [x * duration / waveformx.length, x * duration / waveformx.length],
        y: [waveformMin, waveformMax],
        type: 'scatter',
        mode: 'lines',
        marker: { color: end ? 'orange' : 'green' },
      }
    });
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
              y: [waveformMin - .2, waveformMax + .2],
              type: 'scatter',
              mode: 'lines',
              marker: { color: 'blue' },
            },
            ...startsList
          ]}
          layout={{ title: 'ECG Data', showlegend: false }}
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
          <Button variant='contained' style={{height:"4em"}} onClick={playpause} disabled={!loaded || !!errorMessage}>Play / Pause</Button>
          <Button variant='contained' style={{height:"4em"}} onClick={restart} disabled={!loaded || !!errorMessage}>Restart</Button>
          <Stack style={{height:"4em"}}>
            <Select value={location} style={{height:"4em"}} disabled={!loaded} onChange={handleChange} label="">
              <MenuItem value="aortic">I</MenuItem>
              <MenuItem value="mitral">II</MenuItem>
              <MenuItem value="tricuspid">III</MenuItem>
              {/* <MenuItem value="pulmonic">Pulmonic</MenuItem> */}
              <MenuItem value="unknown">Unknown</MenuItem>
            </Select>
            <FormHelperText>Lead Position</FormHelperText>
          </Stack>

        </Stack>
      </Stack >

    </div >
  );
}

export default App;