import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'

// this adds 'user' property to every Request object
declare global {
  namespace Express {
    interface Request {
      user?: { userId: string; role: string }
    }
  }
}

export const authenticate = (req: Request, res: Response, next: NextFunction) => {
  try {
    // get the Authorization header
    const authHeader = req.headers.authorization

    // if no header or doesn't start with Bearer → reject
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ message: 'No token provided' })
      return
    }

    // extract token → "Bearer abc123" → "abc123"
    const token = authHeader.split(' ')[1]

    // verify token using your secret
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
      userId: string
      role: string
    }

    // attach decoded user to request
    // now any controller can access req.user
    req.user = decoded

    // move to next function (the controller)
    next()

  } catch (error) {
    res.status(401).json({ message: 'Invalid or expired token' })
  }
}
