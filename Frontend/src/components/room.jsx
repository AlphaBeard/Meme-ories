import React, { Component } from "react";
import { socket, cookies } from "../App";
import PlayerList from "./playerList";
import GameBoard from "./gameBoard";
import GameHeader from "./gameHeader";
import { withRouter } from "react-router";
import "../build/Room.css";
const UIDGenerator = require('uid-generator');
const uidgen = new UIDGenerator(); // Default is a 128-bit UID encoded in base58
 
function getRoomID() {
  return window.location.href.split("/")[4];
}
class Room extends Component {
  constructor(props) {
    super(props);
    this.state = {
      id: uidgen.generate(), //Use this for the user id later so we doont query by username
      highlightUsers: [],
      dataLoaded: false,
      roomID: getRoomID(),
      usersData: [],
      roomInfo: null,
      myUser: {},
      showAnswerInput: true,
      forceBoardShow: false,
    };
  }
  componentWillMount() {
    // This attaches event listener event to homepage
    window.addEventListener("beforeunload", (event) => {
      this.sendServerMessage("leftGame", { userData: this.state.myUser });
    });
  }
  componentDidMount() {
    this.socketListenEvents();
    socket.emit("getUserData", { accessToken: this.props.accessToken }, (serverData) => {
      if(!serverData.error){
        this.sendServerMessage("joinedGame", { username: this.props.username, accessToken: this.props.accessToken, fbInfo: serverData });
        this.props.updateLoggedIn(true);
      }else{this.props.updateLoggedIn(false);}
    });
  }
  socketListenEvents = () => {
    socket.on("redirect", (ext) => {
      this.props.history.push(ext);
    });
    socket.on("startGame", (serverData) => {
      this.setState({ roomInfo: serverData.roomInfo });
    });
    socket.on("userLeft", (serverData) => {
      const usersLeft = this.state.usersData.filter((user) => {
        return user.id !== serverData.userData.id;
      });
      this.setState({ usersData: usersLeft });
    });
    socket.on("loadGame", (serverData) => {
      console.log(serverData)
      if (serverData.roomInfo.state === "endRound") {
        this.setState({ forceBoardShow: true });
        setTimeout(() => {
          this.setState({ forceBoardShow: false });
        }, 1500);
      }
      const me = this.getMyUser(serverData.usersData);
      this.setState({ myUser: me, usersData: serverData.usersData, roomInfo: serverData.roomInfo, dataLoaded: true });
    });
  };
  getMyUser = (usersData) => {
    return usersData.find((user) => {
      // TEMPORARY, FOR LOCAL DEVELOPMENT because can't query by fbID
      return user.username === this.props.username;
    });
  };
  startGame = (e) => {
    this.sendServerMessage("startGame", { userData: this.state.myUser });
  };
  submitAnswer = (answer) => {
    this.sendServerMessage("submitAnswer", { userData: this.state.myUser, answer: answer });
    setTimeout(() => {
      this.setState({ showAnswerInput: false });
    }, 1500);
  };
  componentWillUnmount() {
    this.sendServerMessage("leftGame", { userData: this.state.myUser });
  }
  sendServerMessage = (event, data) => {
    socket.emit("userEventMessage", { ...data, event: event, roomID: this.state.roomID });
  };

  render() {
    if (this.state.dataLoaded) {
      const showBoard = (this.state.roomInfo.state === "submitting" || this.state.roomInfo.state === "voting")

      return (
        <div className="container-fluid game-area">
          <div className="row" style={{ height: "10%", paddingBottom: "15px" }}>
            <GameHeader
              dataLoaded={this.state.dataLoaded}
              startGame={this.startGame}
              roomInfo={this.state.roomInfo}
              myUser={this.state.myUser}
            ></GameHeader>
          </div>
          <div className="row" style={{ height: "90%" }}>
            <PlayerList highlightUsers={this.state.highlightUsers} usersData={this.state.usersData} username={this.props.username}></PlayerList>
            {showBoard ? (
              <GameBoard
                myUser={this.state.myUser}
                usersData={this.state.usersData}
                roomInfo={this.state.roomInfo}
                showInput={this.state.showAnswerInput}
                fbImage={this.state.roomInfo.image.source}
                onSubmit={this.submitAnswer}
              ></GameBoard>
            ) : null}
          </div>
        </div>
      );
    } else {
      return (
        <div className="container-fluid game-area justify-content-center align-items-center d-flex">
          <div className="loading-screen" />
        </div>
      );
    }
  }
}

export default withRouter(Room);
