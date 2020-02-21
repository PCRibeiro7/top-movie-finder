import React, { Component } from 'react';
import { Redirect, withRouter } from "react-router-dom";

class Main extends Component {
  render() {
    return (<Redirect from="/" to="/home" />);
  }
}

export default withRouter(Main);
