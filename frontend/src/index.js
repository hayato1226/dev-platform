import React from 'react';
import ReactDOM from 'react-dom';
import {BrowserRouter} from 'react-router-dom';
import './index.css';
import App from './App';

ReactDOM.render(
    <BrowserRouter>
    <link rel="stylesheet" href="https://fonts.googleapis.com/icon?family=Material+Icons" />

        <App/>
    </BrowserRouter>,
    document.getElementById('root'));