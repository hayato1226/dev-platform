import React, { useState, useEffect } from 'react'
import Select from '@material-ui/core/Select';
import InputLabel from '@material-ui/core/InputLabel';
import MenuItem from '@material-ui/core/MenuItem';
import axios from 'axios'
import PropTypes from 'prop-types' 
import { withStyles } from '@material-ui/core/styles'
import AppBar from '@material-ui/core/AppBar'
import Toolbar from '@material-ui/core/Toolbar'
import Paper from '@material-ui/core/Paper'
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableHead from '@material-ui/core/TableHead';
import TableRow from '@material-ui/core/TableRow';
import DeleteIcon from '@material-ui/icons/Delete';
import { Button, Grid, Icon, Typography } from '@material-ui/core';
import TextField from '@material-ui/core/TextField';
import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogContentText from '@material-ui/core/DialogContentText';
import DialogTitle from '@material-ui/core/DialogTitle';


const BACKEND_EP  = process.env.BACKEND_EP || 'http://localhost:3001';

const styles = theme => ({
  root: {
    padding: theme.spacing(5),
  },
  content: {
    maxWidth: 1080,
    marginLeft  : 'auto',
    marginRight : 'auto',
  },
  innercontent: {
    maxWidth: 1024,
    marginLeft  : 'auto',
    marginRight : 'auto',
  },
  toolbar: theme.mixins.toolbar,
})

const App = ({classes}) => {
    const [devenvs, setEnvs] = useState([])
    const [instances, setInstances] = useState([])
    const [envId, setEnvId] = useState("")
    const [open, setOpen] = useState(false);
    const [deviceNum, setDeviceNum] = useState("")
    const [envName, setEnvName] = useState("")

    const getDevEnv = async (id) => {
        const url = `${BACKEND_EP}/stack/${id}`
        console.log(`GET: ${url}`)
        await axios
        .get(url)
        .then(response => {
            setInstances(response.data)
        })
    }

    const changeEnvSelectHandler = async (event) => {
        const id = event.target.value
        getDevEnv(id)
        console.log(instances)
        setEnvId(id)
    }

    const refreshButtonHandler = async (event) => {
        getDevEnv(envId)
        console.log(instances)
    }

    const addButtonHander = async (event) => {
        instances.servers && console.log(instances.servers.length);
        const num = instances.servers.length + 1
        const url = `${BACKEND_EP}/stack/${envId}`
        console.log(`PUT: ${url}`)
        
        await axios.put(url , {id: envId,  number: num}, {
            headers: {
                "Content-Type": "application/json",
            }
        }).then(response => {
            console.log(`update success`)
        })
        await getDevEnv(envId)
    }

    const createEnvButtonHander = async (event) => {
        const url = `${BACKEND_EP}/stack/`
        console.log(`POST: ${url}`)
        console.log(`deviceNum: ${deviceNum}`)
        await axios.post(url , {id: envName,  number: deviceNum}, {
            headers: {
                "Content-Type": "application/json",
            }
        }).then(response => {
            console.log(`create success`)
        })
        axios
            .get(`${BACKEND_EP}/stack`)
            .then(response => {
            setEnvs(response.data.ids)
            })
        setOpen(false);
    }

    const handleClose = () => {
        setOpen(false);
    };
    const handleClickOpen = () => {
        setOpen(true);
    };

    const deviceNumChangeHandler = async (event) => {
        const deviceNum = event.target.value
        setDeviceNum(deviceNum)
    }
    
    const envNameChangeHandler = async (event) => {
        const envName = event.target.value
        setEnvName(envName)
    }
    
    const Instances = (props) => {
        return (
            <div className={classes.innercontent}>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell>#</TableCell>
                            <TableCell align="center">Instance ID</TableCell>
                            <TableCell align="center">Public IP</TableCell>
                            <TableCell align="center">Accessible URL</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {props.instances.servers && props.instances.servers.map((instance, index) => (
                        <TableRow key={instance.instanceId}>
                            <TableCell component="th" scope="row">{index}</TableCell>
                            <TableCell align="right">{instance.instanceId}</TableCell>
                            <TableCell align="right">{instance.publicIp}</TableCell>
                            <TableCell align="center">https://{instance.publicHostName}/</TableCell>
                            <TableCell align="right" ><DeleteIcon /></TableCell>
                        </TableRow>
                    ))}
                    </TableBody>
                </Table>
            </div>
        );
    };

    useEffect(() => {
        console.log('effect')
        axios
            .get(`${BACKEND_EP}/stack`)
            .then(response => {
            setEnvs(response.data.ids)
            })
    }, [])

    return (
        <div className={classes.root}>
            <div className={classes.toolbar}>
                <AppBar>
                    <Toolbar>
                        <Typography variant="h6" color="inherit">
                            DevEnv Platform
                        </Typography>
                    </Toolbar>
                </AppBar>
            </div>
            <div className={classes.content}>
                <Paper>

                    <div className={classes.innercontent}>
                    <h2>Develop Environment</h2>
                    <InputLabel id="label">select environment</InputLabel>
                    <Grid container >
                        <Grid item xs={4}>
                            <Select labelId="label" id="select" value={envId} onChange={changeEnvSelectHandler} fullWidth>
                            {devenvs.map(id => 
                                <MenuItem key={id} value={id}>{id}</MenuItem>)
                            }
                            </Select>
                        </Grid>
                        <Grid item xs={1}>
                            <Icon color="primary" onClick={handleClickOpen}>add_circle</Icon>
                        </Grid>

                    </Grid>
                    <h3>Instance List</h3>
                        <div>
                            <Grid container justify="flex-end">
                                <Grid item>
                                    <Button variant="outlined" color="primary" onClick={refreshButtonHandler}>
                                        REFRESH
                                    </Button>
                                </Grid>　
                                <Grid item>
                                    <Button variant="outlined" color="primary" onClick={addButtonHander}>
                                        ADD
                                    </Button>
                                </Grid>
                            </Grid>
                        </div>
                        <Instances instances={instances}/>
                    </div>
                </Paper>
            </div>
            <div>
            <Dialog open={open} onClose={handleClose} aria-labelledby="form-dialog-title">
        <DialogTitle id="form-dialog-title">Create New Environment</DialogTitle>
        <DialogContent>
          <DialogContentText>
            新しい環境の作成します。任意の環境名と、必要な端末数を入力してください。
          </DialogContentText>
          <Grid container >
            <Grid item xs={5}>
                <TextField
                    autoFocus
                    id="stackName"
                    label="環境名"
                    fullWidth
                    onChange={envNameChangeHandler}
                />
            </Grid>
            <Grid item xs={1}></Grid>
            <Grid item xs={4} >
                <TextField
                    id="deviceNum"
                    label="端末数"
                    type="number"
                    fullWidth
                    onChange={deviceNumChangeHandler}
                />
              </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose} color="primary">
            Cancel
          </Button>
          <Button onClick={createEnvButtonHander} color="primary">
            Create
          </Button>
        </DialogActions>
      </Dialog>

            </div>
        </div>
    )
};

App.propTypes = {
    classes: PropTypes.object.isRequired,
}
  
export default withStyles(styles)(App);