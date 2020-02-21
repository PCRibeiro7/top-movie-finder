import React from 'react';
import { Route, Switch } from 'react-router-dom';

import Main from './components/Main';
import Home from './components/Home';

export default props => (
  <Switch>
    <Route exact path='/' component={ Main } />
    <Route exact path='/home' component={ Home } />
  </Switch>
);
