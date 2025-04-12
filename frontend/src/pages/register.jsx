import { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";


const Register = () => {

    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        email: "",
        password: "",
        role: "",
        profileData: "",
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
            const response = await axios.post("http://localhost:3001/register", formData);
            if (response.status === 201) {
                setSuccess("Registration successful!");
                navigate("/login"); 
                setFormData({email: "", password: ""}); 
            }
        } catch (err) {
            setError(err.response?.data?.message || "An error occurred. Please try again.");
        }
    };

    return (
        <div className="register-container">
            <title>Register</title>
            <h2>Sign Up</h2>
            {error && <p style={{ color: "red" }}>{error}</p>}
            {success && <p style={{ color: "green" }}>{success}</p>}
            <form onSubmit={handleSubmit}>
                <div>
                    <label htmlFor="email">Email:</label>
                    <input
                        type="email"
                        id="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        required
                    />
                </div>
                <div>
                    <label htmlFor="password">Password:</label>
                    <input
                        type="password"
                        id="password"
                        name="password"
                        value={formData.password}
                        onChange={handleChange}
                        required
                    />
                </div>

                <button type="submit">Register</button>
                <button type="button" onClick={() => navigate("/login")}>I already have an account</button>
                <button type="button" onClick={() => navigate("/home")}>Continue without an account</button>
                <button type="button" onClick={() => navigate("/login")}>I'm an admin</button>
            </form>
        </div>
    );
};

export default Register;