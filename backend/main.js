// Get the client
const mysql = require('mysql2');
require('dotenv').config()

// ATTENTION REQUIRED: Create the connection to database

const pool = mysql.createPool({
    host: process.env.SQL_HOSTNAME,
    user: process.env.SQL_USERNAME,
    password: process.env.SQL_PASSWORD,
    database: process.env.SQL_DBNAME,
});

// Set up the API
const express = require('express')
var cors = require('cors');
const bodyParser = require('body-parser')
const app = express()
const port = 3001

// Make it available for public access

app.use(function (req, res, next) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', '*');
    next();
});

app.use(cors());
app.options("*", cors());

app.set('json spaces', 2)
app.use(bodyParser.json({
    limit: "50mb"
}))
app.use(
    bodyParser.urlencoded({
        extended: true,
    })
)

// Listen to outside connection

app.listen(port, () => {
    console.log(`App running on port ${port}. Control+C to exit.`)
})

// Spit out data

app.get('/', (request, response) => {
    response.json(
        {
            info: 'Fitness app API backend'
        }
    )
})

// Users

app.get('/api/users', (req, res) => {
    pool.query('SELECT user_id, fname, lname, username, email, age, height, weight FROM users', [], (error, results) => {
        if (error) {
            console.error('Error fetching users:', error);
            return res.status(500).json({ status: 'error', message: 'Database query failed' });
        }
        res.json({ status: 'success', data: results });
    });
});

app.get('/api/users/:id', (req, res) => {
    const userId = req.params.id;

    pool.query('SELECT fname, lname, username, email, age, height, weight FROM users WHERE user_id = ?', [userId], (err, result) => {
        if (err) {
            console.error('Error fetching user by ID:', err);
            return res.status(500).json({ status: 'error', message: 'Database query failed' });
        }

        if (result.length === 0) {
            return res.status(404).json({ status: 'not_found', message: 'User not found' });
        }

        res.json({ status: 'success', data: result[0] });
    });
});


app.post('/api/users', (req, res) => {
  const { fname, lname, username, email, password, age, height, weight, gender } = req.body;

  const query = `
    INSERT INTO users (fname, lname, username, email, password, age, height, weight, gender)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const values = [fname, lname, username, email, password, age, height, weight, gender];

  pool.query(query, values, (err, result) => {
    if (err) {
      console.error('Error creating user:', err);
      return res.status(500).json({ status: 'error', message: 'Database insert failed' });
    }

    res.status(201).json({
      status: 'success',
      message: 'User created',
      userId: result.insertId
    });
  });
});

  
app.put("/api/users/:id", (request, response) => {
    const id = request.params.id;
    const { fname, lname, username, email, age, gender, height, weight } = request.body;
  
    // Validation (you can customize based on your requirements)
    if (!fname || !lname || !username || !email) {
      return response.status(400).json({
        status: "error",
        message: "First name, last name, username, and email are required",
      });
    }
  
    pool.query(
      "UPDATE users SET fname = ?, lname = ?, username = ?, email = ?, age = ?, gender = ?, height = ?, weight = ? WHERE user_id = ?",
      [fname, lname, username, email, age, gender, height, weight, id],
      (error, result) => {
        if (error) {
          console.error("Error updating user:", error);
          return response.status(500).json({
            status: "error",
            message: "Database error occurred",
          });
        }
  
        if (result.affectedRows === 0) {
          return response.status(404).json({
            status: "error",
            message: `User with ID ${id} not found`,
          });
        }
  
        return response.json({
          status: "success",
          message: "User updated successfully",
        });
      }
    );
  });  


  app.delete("/api/users/:id", (req, res) => {
    const id = req.params.id;
  
    pool.query("DELETE FROM users WHERE user_id = ?", [id], (error, result) => {
      if (error) {
        console.error("Error deleting user:", error);
        return res.status(500).json({
          status: "error",
          message: error.message,
        });
      }
  
      if (result.affectedRows === 0) {
        return res.status(404).json({
          status: "error",
          message: `User with id ${id} not found`,
        });
      }
  
      return res.json({
        status: "success",
        message: "User deleted successfully",
      });
    });
  });
  
  

// Exercises

app.get('/api/exercises', (req, res) => {
    pool.query('SELECT * FROM exercises', [], (err, result) => {
        res.json({ status: 'success', data: result });
    });
});

app.get('/api/users/:id/exercises', (req, res) => {
    const userId = req.params.id;

    const query = `
        SELECT el.*, e.name AS exercise_name
        FROM exercise_log el
        INNER JOIN exercises e ON el.exercise_id = e.exercise_id
        WHERE el.user_id = ?
    `;

    pool.query(query, [userId], (err, result) => {
        if (err) {
            console.error('Error fetching exercise logs:', err);
            return res.status(500).json({ status: 'error', message: 'Database query failed' });
        }

        res.json({ status: 'success', data: result });
    });
});

app.post('/api/users/:id/exercises', (req, res) => {
    const userId = req.params.id;
    const { exercise_id, date, duration, calories_burned } = req.body;

    console.log("userId:", userId);
    console.log("Body:", { exercise_id, date, duration, calories_burned });

    // Optional: basic validation
    if (!exercise_id || !date || !duration || !calories_burned) {
        return res.status(400).json({
            status: 'error',
            message: 'Missing required fields in request body',
        });
    }

    const query = `
        INSERT INTO exercise_log (user_id, exercise_id, date, duration, calories_burned)
        VALUES (?, ?, ?, ?, ?)
    `;

    pool.query(
        query,
        [userId, exercise_id, date, duration, calories_burned],
        (err, result) => {
            if (err) {
                console.error('Error logging exercise:', err.sqlMessage || err);
                return res.status(500).json({
                    status: 'error',
                    message: 'Database insert failed',
                });
            }

            res.json({
                status: 'success',
                message: 'Exercise logged',
            });
        }
    );
});


app.put('/api/users/:id/exercises/:logId', (req, res) => {
    const userId = req.params.id;
    const logId = req.params.logId;
    const { exercise_id, date, duration, calories_burned } = req.body;
  
    // Basic validation
    if (!exercise_id || !date || !duration || !calories_burned) {
      return res.status(400).json({
        status: 'error',
        message: 'All fields (exercise_id, date, duration, calories_burned) are required',
      });
    }
  
    const query = `
      UPDATE exercise_log 
      SET exercise_id = ?, date = ?, duration = ?, calories_burned = ?
      WHERE log_id = ? AND user_id = ?
    `;
  
    pool.query(
      query,
      [exercise_id, date, duration, calories_burned, logId, userId],
      (err, result) => {
        if (err) {
          console.error('Error updating exercise log:', err);
          return res.status(500).json({
            status: 'error',
            message: 'Database update failed',
          });
        }
  
        if (result.affectedRows === 0) {
          return res.status(404).json({
            status: 'error',
            message: `No exercise log found with logId ${logId} for userId ${userId}`,
          });
        }
  
        res.json({
          status: 'success',
          message: 'Exercise log updated successfully',
        });
      }
    );
  });  


app.delete('/api/users/:id/exercises/:logId', (req, res) => {
    const userId = req.params.id;
    const logId = req.params.logId;

    console.log('Received userId:', userId);
    console.log('Received logId:', logId);

    pool.query(
        'DELETE FROM exercise_log WHERE log_id = ? AND user_id = ?',
        [logId, userId],
        (err, result) => {
            if (err) {
                console.error('Error deleting exercise log:', err);
                return res.status(500).json({
                    status: 'error',
                    message: 'Database query failed',
                });
            }

            if (result.affectedRows === 0) {
                return res.status(404).json({
                    status: 'error',
                    message: `No exercise log found with logId ${logId} for userId ${userId}`,
                });
            }

            res.json({
                status: 'success',
                message: 'Exercise log deleted',
            });
        }
    );
});

// Meals

app.get('/api/users/:id/meals', (req, res) => {
    const userId = req.params.id;
    pool.query('SELECT * FROM meals WHERE user_id = ?', [userId], (err, results) => {
      if (err) return res.status(500).json({ status: 'error', message: 'Query failed' });
      res.json({ status: 'success', data: results });
    });
  });
  

  app.post('/api/users/:id/meals', (req, res) => {
    const userId = req.params.id;
    const { meal_type, date, calories } = req.body;
  
    const query = `INSERT INTO meals (user_id, meal_type, date, calories) VALUES (?, ?, ?, ?)`;
    pool.query(query, [userId, meal_type, date, calories], (err, result) => {
      if (err) return res.status(500).json({ status: 'error', message: 'Insert failed' });
      res.json({ status: 'success', message: 'Meal logged' });
    });
  });
  

  app.put('/api/users/:id/meals/:mealId', (req, res) => {
    const userId = req.params.id;
    const mealId = req.params.mealId;
    const { meal_type, date, calories } = req.body;
  
    const query = `
      UPDATE meals
      SET meal_type = ?, date = ?, calories = ?
      WHERE meal_id = ? AND user_id = ?
    `;
  
    pool.query(query, [meal_type, date, calories, mealId, userId], (err, result) => {
      if (err) return res.status(500).json({ status: 'error', message: 'Update failed' });
      if (result.affectedRows === 0) return res.status(404).json({ status: 'error', message: 'Meal not found' });
      res.json({ status: 'success', message: 'Meal updated' });
    });
  });
  

  app.delete('/api/users/:id/meals/:mealId', (req, res) => {
    const userId = req.params.id;
    const mealId = req.params.mealId;

    pool.query('DELETE FROM meals WHERE meal_id = ? AND user_id = ?', [mealId, userId], (err, result) => {
      if (err) return res.status(500).json({ status: 'error', message: 'Delete failed' });
      if (result.affectedRows === 0) return res.status(404).json({ status: 'error', message: 'Meal not found' });
      res.json({ status: 'success', message: 'Meal deleted' });
    });
  });


  // Sleep

app.get('/api/users/:id/sleep', (req, res) => {
    pool.query('SELECT * FROM sleep WHERE user_id = ?', [req.params.id], (err, results) => {
      if (err) return res.status(500).json({ status: 'error', message: 'Query failed' });
      res.json({ status: 'success', data: results });
    });
  });
  
  app.post('/api/users/:id/sleep', (req, res) => {
    const userId = req.params.id;
    const { date, hours_sleep } = req.body;
  
    const hours = parseFloat(hours_sleep);
  
    if (isNaN(hours)) {
      return res.status(400).json({ status: 'error', message: 'Invalid hours_slept value' });
    }
  
    const query = `INSERT INTO sleep (user_id, date, hours_sleep) VALUES (?, ?, ?)`;
    pool.query(query, [userId, date, hours], (err, result) => {
      if (err) {
        console.error('Error inserting sleep log:', err);
        return res.status(500).json({ status: 'error', message: 'Insert failed' });
      }
      res.json({ status: 'success', message: 'Sleep logged' });
    });
  });

  
  app.put('/api/users/:id/sleep/:sleepId', (req, res) => {
    const userId = req.params.id;
    const sleepId = req.params.sleepId;
    const { date, hours_sleep } = req.body;
  
    const hours = parseFloat(hours_sleep);
  
    if (isNaN(hours)) {
      return res.status(400).json({ status: 'error', message: 'Invalid hours_slept value' });
    }
  
    const query = `
      UPDATE sleep
      SET date = ?, hours_sleep = ?
      WHERE user_id = ? AND sleep_id = ?
    `;
  
    pool.query(query, [date, hours, userId, sleepId], (err, result) => {
      if (err) {
        console.error('Error updating sleep record:', err);
        return res.status(500).json({ status: 'error', message: 'Update failed' });
      }
  
      if (result.affectedRows === 0) {
        return res.status(404).json({
          status: 'error',
          message: `Sleep record with ID ${sleepId} not found for user ${userId}`,
        });
      }
  
      res.json({ status: 'success', message: 'Sleep record updated' });
    });
  });
  
  
  app.delete('/api/users/:id/sleep/:sleepId', (req, res) => {
    const userId = req.params.id;
    const sleepId = req.params.sleepId;
  
    const query = 'DELETE FROM sleep WHERE user_id = ? AND sleep_id = ?';
  
    pool.query(query, [userId, sleepId], (err, result) => {
      if (err) {
        console.error('Error deleting sleep record:', err);
        return res.status(500).json({ status: 'error', message: 'Delete failed' });
      }
  
      if (result.affectedRows === 0) {
        return res.status(404).json({
          status: 'error',
          message: `Sleep record with ID ${sleepId} not found for user ${userId}`,
        });
      }
  
      res.json({ status: 'success', message: 'Sleep record deleted' });
    });
  });
  
  // Goals 

app.get('/api/users/:id/activity_goals', (req, res) => {
    pool.query('SELECT * FROM activity_goals WHERE user_id = ?', [req.params.id], (err, results) => {
      if (err) return res.status(500).json({ status: 'error', message: 'Query failed' });
      res.json({ status: 'success', data: results });
    });
  });
  
  app.put('/api/users/:id/activity_goals/:goalId', (req, res) => {
    const userId = req.params.id;
    const goalId = req.params.goalId;
    const { goal_value, period_days } = req.body;
  
    if (goal_value === undefined || period_days === undefined) {
      return res.status(400).json({ status: 'error', message: 'Goal value and period days are required' });
    }
  
    const query = `
      UPDATE activity_goals
      SET goal_value = ?, period_days = ?
      WHERE id = ? AND user_id = ?
    `;
  
    pool.query(query, [goal_value, period_days, goalId, userId], (err, result) => {
      if (err) {
        console.error('Error updating goal:', err);
        return res.status(500).json({ status: 'error', message: 'Update failed' });
      }
  
      if (result.affectedRows === 0) {
        return res.status(404).json({
          status: 'error',
          message: `Goal with ID ${goalId} not found for user ${userId}`,
        });
      }
  
      res.json({
        status: 'success',
        message: 'Goal updated successfully',
      });
    });
  });
  
  // Analytics

app.get('/api/weekly_performance_review', (req, res) => {
    const query = `SELECT * FROM weekly_performance_review`;

    pool.query(query, (err, results) => {
      if (err) {
        console.error('Error fetching performance data from view:', err);
        return res.status(500).json({ status: 'error', message: 'Query failed' });
      }
  
      if (results.length === 0) {
        return res.status(404).json({ status: 'error', message: 'No performance data found' });
      }
  
      res.json({ status: 'success', data: results });
  });
});
  