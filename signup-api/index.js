const express = require('express');
const bodyParser = require('body-parser');
const mysql = require('mysql');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const axios = require('axios');
const cheerio = require('cheerio');
const router = express.Router();
const crypto = require('crypto');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 5000;

app.use(cors({
    origin: 'http://localhost:3000', // Replace with your frontend's origin
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true
  }));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Set up multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`);
    }
});

const upload = multer({ storage });

// Create connection to MySQL database
const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,  // Use empty string if no password
    database: process.env.DB_NAME
});



db.connect(error => {
  if (error) {
    console.error('Error connecting to the database:',error);
    console.log(db.password);
    console.log(db.user);
    console.log(db.database);
    return;
  }
  console.log('Connected to the database.');
});

// Root route
app.get('/', (req, res) => {
    res.send('Welcome to the Signup API');
});

// Signup endpoint
app.post('/api/signup', upload.single('trading_license'), (req, res) => {
    const { 
        first_name, last_name, designation, company_name, warehouse_address,
        company_type, phone_number, email, office_address, password, confirm_password 
    } = req.body;
    const trading_license = req.file.path;

    const query = `
        INSERT INTO users (
            first_name, last_name, designation, company_name, warehouse_address,
            company_type, trading_license, phone_number, email, office_address,
            password, confirm_password
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    db.query(query, [
        first_name, last_name, designation, company_name, warehouse_address,
        company_type, trading_license, phone_number, email, office_address,
        password, confirm_password
    ], (err, result) => {
        if (err) {
            return res.status(500).send(err);
        }
        res.status(201).send({ message: 'User registered successfully' });
    });
});

  app.post('/api/login', (req, res) => {
    const { email, password } = req.body;
  
    // Check if user exists
    const query = 'SELECT * FROM users WHERE email = ?';
    db.query(query, [email], async (err, results) => {
      if (err) throw err;
      if (results.length === 0) {
        return res.status(400).json({ success: false, message: 'Invalid email or password.' });
      }
  
      const user = results[0];
      console.log(user);

    // Compare plain text passwords
    if (password !== user.password) {
      return res.status(400).json({ success: false, message: 'Invalid email or password.' });
    }
  
      res.json({ success: true, message: 'Login successful',userId:user.id });
    });
  });

  app.get('/api/login', (req, res) => {
    const { email, password } = req.body;
  
    // Check if user exists
    const query = 'SELECT * FROM users WHERE email = ?';
    db.query(query, [email], async (err, results) => {
      if (err) throw err;
      if (results.length === 0) {
        return res.status(400).json({ success: false, message: 'Invalid email or password.' });
      }
  
      const user = results[0];
      console.log(user);

    // Compare plain text passwords
    if (password !== user.password) {
      return res.status(400).json({ success: false, message: 'Invalid email or password.' });
    }
  
      res.json({ success: true, message: 'Login successful',userId:user.id });
    });
  });

  // app.get('/api/user/:email', (req, res) => {
  //   const { email } = req.params;

  //   // Query to fetch specific user data by email
  //   const query = 'SELECT first_name, last_name, email FROM users WHERE email = ?';
  //   db.query(query, [email], (err, results) => {
  //       if (err) {
  //           return res.status(500).send(err);
  //       }
  //       if (results.length === 0) {
  //           return res.status(404).json({ message: 'User not found' });
  //       }
  //       const userData = results[0];
  //       res.json(userData);
  //   });
  // });

app.get('/api/user/:email', (req, res) => {
    const { email } = req.params;

    // Query to fetch specific user data by email
    const query = 'SELECT * FROM users WHERE email = ?';
    db.query(query, [email], (err, results) => {
        if (err) {
            return res.status(500).send(err);
        }
        if (results.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }
        const userData = results[0];
        res.json(userData);
    });
});

app.get('/api/products', (req, res) => {
    const query = 'SELECT * FROM products';
    db.query(query, (err, results) => {
        if (err) {
            console.error('Error fetching products:', err);
            res.status(500).send('Error fetching products');
            return;
        }
        res.json(results);
    });
});

app.get('/api/carmakers', (req, res) => {
    const query = 'SELECT * FROM cars_manufacturer';
    db.query(query, (err, results) => {
        if (err) {
            console.error('Error fetching Cars Manufacturer:', err);
            res.status(500).send('Error fetching Cars Manufacturer');
            return;
        }
        res.json(results);
    });
});

//Show Products
app.get('/products/count', (req, res) => {
    let sql = 'SELECT COUNT(*) AS count FROM products';
    db.query(sql, (err, result) => {
        if (err) throw err;
        res.json(result[0]);
    });
});

// API endpoint to search products by product_sku
app.post('/api/searchProducts', (req, res) => {
    const { VENDOR_CODE } = req.body;
    const query = `SELECT * FROM tble_products WHERE VENDOR_CODE LIKE ?`;

    db.query(query, [`%${VENDOR_CODE}%`], (err, results) => {
        if (err) {
            console.error('Database query error:', err);
            res.status(500).json({ error: 'Database query error' });
        } else {
            console.log('Query results:', results);
            if (results.length > 0) {
                res.json(results); // Send all matching products
            } else {
                res.json([]); // Send empty array if no products found
            }
        }
    });
});


// app.post('/api/submitOrder', (req, res) => {
//   const orderDetails = req.body;

//   // Generate random 16-digit order tracking number
//   const generateTrackingNumber = () => {
//       let trackingNumber = '';
//       while (trackingNumber.length < 16) {
//           trackingNumber += Math.floor(Math.random() * 10); // Add a random digit (0-9)
//       }
//       return trackingNumber;
//   };

//   const query = 'INSERT INTO orders (VENDOR_CODE, BRAND, TITLE, QUANTITY, WEIGHT, PRICE_AED, status, order_tracking_number) VALUES ?';
//   const values = orderDetails.map(item => [
//       item.VENDOR_CODE,
//       item.BRAND,
//       item.TITLE,
//       item.QUANTITY,
//       item.WEIGHT,
//       item.PRICE_AED,
//       'pending',
//       generateTrackingNumber()
//   ]);

//   db.query(query, [values], (err, result) => {
//       if (err) throw err;
//       res.send({ message: 'Order submitted successfully' });
//   });
// });

// SUBMIT NEW ORDER
// app.js or your main server file
app.post('/api/submitOrder', (req, res) => {
  const { products, userId, userEmail } = req.body;

  // Generate random 16-digit order tracking number
  const generateTrackingNumber = () => {
      let trackingNumber = '';
      while (trackingNumber.length < 16) {
          trackingNumber += Math.floor(Math.random() * 10); // Add a random digit (0-9)
      }
      return trackingNumber;
  };

  const trackingNumber = generateTrackingNumber();

  // Calculate total amount
  const totalAmount = products.reduce((sum, product) => sum + product.totalPrice, 0);

  // Insert into order_details table
  const orderDetailsQuery = 'INSERT INTO order_details (invoice_no, total_amount, user_id) VALUES (?, ?, ?)';
  db.query(orderDetailsQuery, [trackingNumber, totalAmount, userId], (err, result) => {
      if (err) {
          console.error('Error inserting order details:', err);
          return res.status(500).send({ message: 'Error submitting order details' });
      }

      // Insert into orders table
      const ordersQuery = 'INSERT INTO orders (VENDOR_CODE, BRAND, TITLE, QUANTITY, WEIGHT, PRICE_AED, status, order_tracking_number, order_email,id) VALUES ?';
      const values = products.map(item => [
          item.VENDOR_CODE,
          item.BRAND,
          item.TITLE,
          item.QUANTITY,
          item.WEIGHT,
          item.PRICE_AED,
          'pending',
          trackingNumber,
          userEmail,
          userId
      ]);

      db.query(ordersQuery, [values], (err, result) => {
          if (err) {
              console.error('Error inserting order:', err);
              return res.status(500).send({ message: 'Error submitting order' });
          }
          res.send({ message: 'Order submitted successfully' });
      });
  });
});


// SHOW ORDERS API END POINTS 
//SHOW ORDERS WHICH ARE PENDING
// app.get('/api/pendingOrders', (req, res) => {
//     const query = 'SELECT * FROM orders WHERE status = "pending"';
//     db.query(query, (err, results) => {
//         if (err) throw err;
//         res.json(results);
//     });
// });

// app.get('/api/pendingOrders', (req, res) => {
//   const userId = req.query.userId; // Retrieve userId from query parameters
//   if (!userId) {
//       return res.status(400).json({ error: 'User ID is required' });
//   }

//   const query = 'SELECT * FROM orders WHERE status = "pending" AND id = ?'; // Filter by user_id
//   db.query(query, [userId], (err, results) => {
//       if (err) {
//           console.error('Database query error:', err);
//           return res.status(500).json({ error: 'Internal server error' });
//       }
//       res.json(results);
//   });
// });

//SHOW ORDERS WHICH ARE CONFIRMED
// app.get('/api/confirmedOrders', (req, res) => {
//     const query = 'SELECT * FROM orders WHERE status = "confirmed"';
//     db.query(query, (err, results) => {
//         if (err) throw err;

//         let subtotal = 0;
//         results.forEach(order => {
//             subtotal += order.PRICE_AED;
//         });

//         const total = subtotal;

//         // Construct response
//       const response = {
//         orders: results,
//         subtotal: subtotal,
//         total: total
//       };

//         res.json(results);
//     });
// });

app.get('/api/pendingOrders', (req, res) => {
  const userId = req.query.userId; // Retrieve userId from query parameters
  if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
  }

  const query = 'SELECT * FROM orders WHERE status = "pending" AND id = ?'; // Filter by user_id
  db.query(query, [userId], (err, results) => {
      if (err) {
          console.error('Database query error:', err);
          return res.status(500).json({ error: 'Internal server error' });
      }
      res.json(results);
  });
});

//SHOW ORDERS WHICH ARE CONFIRMED
app.get('/api/confirmedOrders', (req, res) => {
  const userId = req.query.userId; // Retrieve userId from query parameters
  if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
  }

    const query = 'SELECT * FROM orders WHERE status = "confirmed" AND id = ?';
    db.query(query,[userId], (err, results) => {
        if (err) throw err;

        let subtotal = 0;
        results.forEach(order => {
            subtotal += order.PRICE_AED;
        });

        const total = subtotal;

        // Construct response
      const response = {
        orders: results,
        subtotal: subtotal,
        total: total
      };

        res.json(results);
    });
});

app.get('/api/cartOrders', (req, res) => {
    const query = "SELECT * FROM orders WHERE status = 'confirmed'";
    pool.query(query, (error, results) => {
      if (error) {
        console.error(error);
        return res.status(500).send('Server error');
      }
  
      // Calculate subtotal and total
      let subtotal = results.reduce((acc, order) => acc + order.PRICE_AED, 0);
      let total = subtotal; // Add additional calculations if needed
  
      res.json({
        orders: results,
        subtotal,
        total
      });
    });
  });

// app.get('/api/confirmedOrders', (req, res) => {
//     const sql = 'SELECT * FROM orders WHERE status = "confirmed"';
//     db.query(sql, (err, results) => {
//       if (err) {
//         console.error('Error fetching confirmed orders:', err);
//         res.status(500).json({ error: 'Error fetching confirmed orders' });
//         return;
//       }
  
//       // Calculate subtotal and total
//       let subtotal = 0;
//       results.forEach(order => {
//         // Assuming price is stored in the database, adjust this according to your schema
//         subtotal += order.PRICE_AED;
//       });
  
//       // For simplicity, hardcoding total calculation
//       const total = subtotal; // Adjust as per your logic
  
//       // Construct response
//       const response = {
//         orders: results,
//         subtotal: subtotal,
//         total: total
//       };
  
//       res.json(response);
//     });
//   });


const pool = mysql.createPool({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,  // Use empty string if no password
      database: process.env.DB_NAME
  });

  module.exports = pool;

  
  //REMOVE AND ORDER FROM DATABASE AND USERPRFILE
  app.delete('/api/orders/:order_id', (req, res) => {
    const { order_id } = req.params;
    pool.query('DELETE FROM orders WHERE order_id = ?', [order_id], (error, results) => {
      if (error) {
        console.error('Error removing order:', error);
        return res.status(500).json({ error: error.message });
      }
      if (results.affectedRows === 0) {
        return res.status(404).json({ message: 'Order not found' });
      }
      res.json({ message: 'Order removed successfully' });
    });
  });
  
  // GENERATE INVOICE: CHANGE ORDER STATUS TO CONFIRMED
  app.put('/api/orders/:order_id/generateInvoice', (req, res) => {
    const { order_id } = req.params;
    pool.query(
      'UPDATE orders SET status = "confirmed" WHERE order_id = ?',
      [order_id],
      (error, results) => {
        if (error) {
          console.error('Error generating invoice:', error);
          return res.status(500).json({ error: error.message });
        }
        if (results.affectedRows === 0) {
          return res.status(404).json({ message: 'Order not found' });
        }
        res.json({ message: 'Order status updated to confirmed' });
      }
    );
  });

  // Cart Items
  app.post('/api/addToCart', (req, res) => {
    const { order_tracking_number, order_state, PRICE_AED } = req.body;
    console.log('Received order:', req.body);  // Log the incoming request
  
    if (!order_tracking_number || !order_state || !PRICE_AED) {
      console.error('Invalid request payload');
      return res.status(400).send('Invalid request payload');
    }
  
    const query = 'INSERT INTO cart (order_tracking_number, order_state, PRICE_AED) VALUES (?, ?, ?)';
    db.query(query, [order_tracking_number, order_state, PRICE_AED], (error, results) => {
      if (error) {
        console.error('Database error:', error);  // Log the error
        return res.status(500).send('Error adding order to cart');
      }
      res.status(200).send('Order added to cart');
    });
  });
  
  
  // Show Cart Items
  app.get('/api/cart', (req, res) => {
    const query = 'SELECT * FROM cart';
    db.query(query, (error, results) => {
      if (error) {
        return res.status(500).send(error);
      }
      res.json(results);
    });
  });

  //Remove Cart Items

  app.post('/api/removeFromCart', (req, res) => {
    const { order_tracking_number } = req.body;
    const query = 'DELETE FROM cart WHERE order_tracking_number = ?';
    db.query(query, [order_tracking_number], (error, results) => {
        if (error) {
            return res.status(500).json({ error: 'Failed to remove item from cart' });
        }
        res.status(200).json({ message: 'Item removed from cart successfully' });
    });
});


app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
