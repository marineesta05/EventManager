import { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";


const Event = () => {

    const navigate = useNavigate();
    const token = localStorage.getItem("token");

    const [formData, setFormData] = useState({
        title: "",
        location: "",
        datetime: "",
        capacity: "",
    });

    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setSuccess("");

        try {
            const response = await axios.post("http://localhost:3002/events", formData, {
                headers:{
                    Authorization: `Bearer ${token}`

                }
            });
            if (response.status === 201) {
                setSuccess("Event created successfully!");
                navigate("/home"); 
                setFormData({title: "", location: "", datetime: "", capacity: ""}); 
            }
        } catch (err) {
            setError(err.response?.data?.message || "An error occurred. Please try again.");
        }
    };

    return (
        <div className="event">
            <h2>Create a new event</h2>
            {error && <p style={{ color: "red" }}>{error}</p>}
            {success && <p style={{ color: "green" }}>{success}</p>}
            <form onSubmit={handleSubmit}>
                <div>
                    <label htmlFor="title">title:</label>
                    <input
                        type="title"
                        id="title"
                        name="title"
                        value={formData.title}
                        onChange={handleChange}
                        required
                    />
                </div>
                <div>
                    <label htmlFor="location">location:</label>
                    <input
                        type="location"
                        id="location"
                        name="location"
                        value={formData.location}
                        onChange={handleChange}
                        required
                    />
                </div>

                <div>
                    <label htmlFor="datetime">datetime:</label>
                    <input
                        type="date"
                        id="datetime"
                        name="datetime"
                        value={formData.datetime}
                        onChange={handleChange}
                        required
                    />
                </div>

                <div>
                    <label htmlFor="capacity">Profile Data:</label>
                    <input
                        type="text"
                        id="capacity"
                        name="capacity"
                        value={formData.capacity}
                        onChange={handleChange}
                        required
                    />
                </div>
                <button type="submit">Create</button>
            </form>
        </div>
    );
};

export default Event;