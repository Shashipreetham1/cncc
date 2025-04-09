// Create a utils folder if you don't have one: mkdir backend/utils
import jwt from 'jsonwebtoken';

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '30d', // Token expires in 30 days (adjust as needed)
  });
};

export default generateToken;