import { BrowserRouter as Router, Switch, Route } from "react-router-dom";
import Client from './Client';
import Landing from './Landing';

const App = () => {
  return (
    <div>
      <Router>
        <Switch>
          <Route path="/test">
            <Client debug={"test"}/>
          </Route>
          <Route path="/:matchID/:numPlayers/:playerID">
              <Client />
          </Route>
          <Route path="/">
              <Landing />
          </Route>
        </Switch>
      </Router>
    </div>
  );
}

export default App;
