import { BrowserRouter as Router, Switch, Route } from "react-router-dom";
import Client from './Client';
import Landing from './Landing';
import SeatPicker from './SeatPicker';
import JoinResolver from './JoinResolver';

const App = () => {
  return (
    <div>
      <Router>
        <Switch>
          <Route path="/test">
            <Client debug={"test"} />
          </Route>
          <Route exact path="/join/:code">
            <JoinResolver />
          </Route>
          {/* /:gameId/:matchID/:numPlayers/:playerID */}
          <Route path="/:gameId/:matchID/:numPlayers/:playerID">
            <Client />
          </Route>
          {/* /:gameId/:matchID/:numPlayers */}
          <Route exact path="/:gameId/:matchID/:numPlayers">
            <SeatPicker />
          </Route>
          <Route exact path="/">
            <Landing />
          </Route>
        </Switch>
      </Router>
    </div>
  );
}

export default App;
