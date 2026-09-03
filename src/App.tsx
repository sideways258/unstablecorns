import { BrowserRouter as Router, Switch, Route } from "react-router-dom";
import Client from './Client';
import Landing from './Landing';
import JoinResolver from './JoinResolver';
import { ThemeFX } from './ui/themed';

const App = () => {
  return (
    <div>
      <ThemeFX />
      <Router>
        <Switch>
          <Route path="/test">
            <Client debug={"test"} />
          </Route>
          <Route exact path="/join/:code">
            <JoinResolver />
          </Route>
          {/* /:gameId/:matchID/:numPlayers/:playerID - the running game */}
          <Route path="/:gameId/:matchID/:numPlayers/:playerID">
            <Client />
          </Route>
          {/* /:gameId/:matchID/:numPlayers - old invite links: auto-assign a seat */}
          <Route exact path="/:gameId/:matchID/:numPlayers">
            <JoinResolver />
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
