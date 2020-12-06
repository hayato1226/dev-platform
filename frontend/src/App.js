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
import { Button, Grid, Typography } from '@material-ui/core';

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

    const getDevEnv = async (id) => {
        const url = `${BACKEND_EP}/devenv/${id}`
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
        const url = `${BACKEND_EP}/devenv/${envId}`
        console.log(`PUT: ${url}`)
        
        await axios.put(url , {id: "test",  number: num}, {
            headers: {
                "Content-Type": "application/json",
            }
        }).then(response => {
            console.log(`update success`)
        })
        await getDevEnv(envId)
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
            .get('http://localhost:3001/devenv')
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
                        <Grid container>
                            <h3>Instance List</h3>
                        </Grid>
                        <InputLabel id="label">select environment</InputLabel>
                        <Select labelId="label" id="select" value={envId} onChange={changeEnvSelectHandler}>
                        {devenvs.map(id => 
                            <MenuItem key={id} value={id}>{id}</MenuItem>)
                        }
                        </Select>
                    </div>
                    <div className={classes.innercontent}>
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
        </div>
    )
};

App.propTypes = {
    classes: PropTypes.object.isRequired,
}
  
export default withStyles(styles)(App);