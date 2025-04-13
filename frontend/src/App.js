import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import axios from "axios"; 
import Register from "./pages/register"; 
import Login from "./pages/login"; 
import Home from "./pages/home";
import Event from "./pages/createEvent";
import EventId from "./pages/event"
import Update from "./pages/updateEvent";
import Navbar from "./pages/navBar";
import Dashboard from "./pages/dashboard";
import "./App.css";

const token = localStorage.getItem("token");
if (token) {
  axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
}

function App() {
  return (
    
    <Router>
      <Navbar />
        <Routes>
          <Route path="/" element={<Navigate to="/register" />} />
          <Route path="/register" element={<Register />} />
          <Route path="/login" element={<Login />} />
          <Route path="/home" element={<Home />} />
          <Route path="/createEvent" element={<Event />} />
          <Route path="/event/:id" element={<EventId />} />
          <Route path="/updateEvent/:id" element={<Update />} />
          <Route path="/dashboard" element={<Dashboard />} />
          
        </Routes>
    </Router>
  );
}

export default App;