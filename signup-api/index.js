const express = require("express");
const bodyParser = require("body-parser");
const mysql = require("mysql");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const axios = require("axios");
const cheerio = require("cheerio");
const router = express.Router();
const crypto = require("crypto");
require("dotenv").config();
const Stripe = require('stripe');

const stripe = Stripe('your_stripe_secret_key');

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());

app.use(
  cors({
    origin: "http://localhost:3000", // Replace with your frontend's origin
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  })
);

-app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Set up multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const upload = multer({ storage });

// Create connection to MySQL database
const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD, // Use empty string if no password
  database: process.env.DB_NAME,
});

db.connect((error) => {
  if (error) {
    console.error("Error connecting to the database:", error);
    console.log(db.password);
    console.log(db.user);
    console.log(db.database);
    return;
  }
  console.log("Connected to the database.");
});

// Root route
app.get("/", (req, res) => {
  res.send("Welcome to the Signup API");
});

// Signup endpoint
// app.post("/api/signup", upload.single("trading_license"), (req, res) => {
//   const {
//     first_name,
//     last_name,
//     designation,
//     company_name,
//     warehouse_address,
//     company_type,
//     phone_number,
//     email,
//     ref_name,
//     office_address,
//     password,
//     confirm_password,
//   } = req.body;
//   const trading_license = req.file.path;

//   const query = `
//         INSERT INTO users (
//             first_name, last_name, designation, company_name, warehouse_address,
//             company_type, trading_license, phone_number, email, ref_name, office_address,
//             password, confirm_password
//         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
//     `;

//   db.query(
//     query,
//     [
//       first_name,
//       last_name,
//       designation,
//       company_name,
//       warehouse_address,
//       company_type,
//       trading_license,
//       phone_number,
//       email,
//       ref_name,
//       office_address,
//       password,
//       confirm_password,
//     ],
//     (err, result) => {
//       if (err) {
//         return res.status(500).send(err);
//       }
//       res.status(201).send({ message: "User registered successfully" });
//     }
//   );
// });

app.post('/api/signup', upload.single('trading_license'), (req, res) => {
  const {
    first_name, last_name, designation, company_name, warehouse_address,
    company_type, phone_number, ref_name, email, office_address, password, confirm_password
  } = req.body;
  const trading_license = req.file.path;

  const query = `
    INSERT INTO users (
      first_name, last_name, designation, company_name, warehouse_address,
      company_type, trading_license, phone_number,ref_name, email, office_address,
      password, confirm_password
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  db.query(query, [
    first_name, last_name, designation, company_name, warehouse_address,
    company_type, trading_license, phone_number, ref_name, email, office_address,
    password, confirm_password
  ], (err, result) => {
    if (err) {
      return res.status(500).send(err);
    }
    const userId = result.insertId;
    res.json({ success: true, message: 'User registered successfully', userId: userId });
  });
});

app.post("/api/login", (req, res) => {
  const { email, password } = req.body;

  // Check if user exists
  const query = "SELECT * FROM users WHERE email = ?";
  db.query(query, [email], async (err, results) => {
    if (err) throw err;
    if (results.length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid email or password." });
    }

    const user = results[0];
    console.log(user);

    // Compare plain text passwords
    if (password !== user.password) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid email or password." });
    }

    res.json({ success: true, message: "Login successful", userId: user.id });
  });
});

// app.get('/api/login', (req, res) => {
//   const { email, password } = req.body;

//   // Check if user exists
//   const query = 'SELECT * FROM users WHERE email = ?';
//   db.query(query, [email], async (err, results) => {
//     if (err) throw err;
//     if (results.length === 0) {
//       return res.status(400).json({ success: false, message: 'Invalid email or password.' });
//     }

//     const user = results[0];
//     console.log(user);

//     // Compare plain text passwords
//     if (password !== user.password) {
//       return res.status(400).json({ success: false, message: 'Invalid email or password.' });
//     }

//     res.json({ success: true, message: 'Login successful', userId: user.id });
//   });
// });

app.get("/api/user/:email", (req, res) => {
  const { email } = req.params;

  // Query to fetch specific user data by email
  const query = "SELECT * FROM users WHERE email = ?";
  db.query(query, [email], (err, results) => {
    if (err) {
      return res.status(500).send(err);
    }
    if (results.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }
    const userData = results[0];
    res.json(userData);
  });
});

app.get("/api/products", (req, res) => {
  const query = "SELECT * FROM products";
  db.query(query, (err, results) => {
    if (err) {
      console.error("Error fetching products:", err);
      res.status(500).send("Error fetching products");
      return;
    }
    res.json(results);
  });
});

app.get("/api/carmakers", (req, res) => {
  const query = "SELECT * FROM cars_manufacturer";
  db.query(query, (err, results) => {
    if (err) {
      console.error("Error fetching Cars Manufacturer:", err);
      res.status(500).send("Error fetching Cars Manufacturer");
      return;
    }
    res.json(results);
  });
});

//Show Products
app.get("/products/count", (req, res) => {
  let sql = "SELECT COUNT(*) AS count FROM products";
  db.query(sql, (err, result) => {
    if (err) throw err;
    res.json(result[0]);
  });
});

// API endpoint to search products by product_sku
app.post("/api/searchProducts", (req, res) => {
  const { VENDOR_CODE } = req.body;
  const query = `SELECT * FROM tble_products WHERE VENDOR_CODE LIKE ?`;

  db.query(query, [`%${VENDOR_CODE}%`], (err, results) => {
    if (err) {
      console.error("Database query error:", err);
      res.status(500).json({ error: "Database query error" });
    } else {
      console.log("Query results:", results);
      if (results.length > 0) {
        res.json(results); // Send all matching products
      } else {
        res.json([]); // Send empty array if no products found
      }
    }
  });
});

app.post("/api/searchProductsV2", (req, res) => {
  const { VENDOR_CODE } = req.body;
  let vcode = "77280SJD003,77280T2FA71ZA";
  const query = `SELECT * FROM tble_products WHERE FIND_IN_SET(VENDOR_CODE,'${VENDOR_CODE}')`;

  db.query(query, [`${vcode}`], (err, results) => {
    if (err) {
      console.error("Database query error:", err);
      res.status(500).json({ error: "Database query error" });
    } else {
      console.log("Query results:", results);
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
app.post("/api/submitOrder", (req, res) => {
  const { products, userId, userEmail, orderTotalAmount, invoiceNo } = req.body;

  // Generate random 16-digit order tracking number
  const generateTrackingNumber = () => {
    let trackingNumber = "";
    while (trackingNumber.length < 8) {
      trackingNumber += Math.floor(Math.random() * 10); // Add a random digit (0-9)
    }
    return trackingNumber;
  };

  const trackingNumber = generateTrackingNumber();

  // Begin transaction
  db.beginTransaction((err) => {
    if (err) {
      console.error("Error starting transaction:", err);
      return res.status(500).send({ message: "Error starting transaction" });
    }

    // Insert into orders table
    const ordersQuery =
      "INSERT INTO orders (VENDOR_CODE, BRAND, TITLE, QUANTITY, WEIGHT, PRICE_AED, status, order_tracking_number, order_email, id, ref_number) VALUES ?";
    const values = products.map((item) => [
      item.VENDOR_CODE,
      item.BRAND,
      item.TITLE,
      item.QUANTITY,
      item.WEIGHT,
      item.PRICE_AED,
      "confirmed",
      trackingNumber,
      userEmail,
      userId,
      item.refNumber,
    ]);

    db.query(ordersQuery, [values], (err, result) => {
      if (err) {
        return db.rollback(() => {
          console.error("Error inserting order:", err);
          res.status(500).send({ message: "Error submitting order" });
        });
      }

      // Insert into order_details table
      const orderDetailsQuery =
        "INSERT INTO order_details (total_amount, user_id, invoice_no, status, order_tracking_number) VALUES (?, ?, ?, ?, ?)";
      db.query(
        orderDetailsQuery,
        [orderTotalAmount, userId, invoiceNo, "confirmed", trackingNumber],
        (err, result) => {
          if (err) {
            return db.rollback(() => {
              console.error("Error inserting order details:", err);
              res
                .status(500)
                .send({ message: "Error submitting order details" });
            });
          }

          // Commit transaction
          db.commit((err) => {
            if (err) {
              return db.rollback(() => {
                console.error("Error committing transaction:", err);
                res
                  .status(500)
                  .send({ message: "Error committing transaction" });
              });
            }

            res.send({
              message: "Order submitted successfully",
              trackingNumber,
            });
          });
        }
      );
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

app.post(
  "/api/upload-payment",
  upload.single("payment_receipt"),
  (req, res) => {
    const { order_tracking_number } = req.body;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    if (!order_tracking_number) {
      return res
        .status(400)
        .json({ message: "Order tracking number is required" });
    }

    console.log(order_tracking_number);

    const filePath = file.path;

    // Update the receipt_path in the database
    const updateQuery =
      'UPDATE order_details SET receipt_path = ?, status = "underprocess" WHERE invoice_no = ?';

    db.query(
      updateQuery,
      [filePath, order_tracking_number],
      (error, results) => {
        if (error) {
          console.error("Error updating receipt path:", error);
          return res
            .status(500)
            .json({
              message: "Error updating receipt path. Please try again.",
            });
        }

        console.log(results);

        res.status(200).json({
          message: "Payment receipt uploaded and path updated successfully",
          filePath: filePath,
          orderTrackingNumber: order_tracking_number,
        });
      }
    );
  }
);

app.get("/api/pendingOrders", (req, res) => {
  const userId = req.query.userId; // Retrieve userId from query parameters
  if (!userId) {
    return res.status(400).json({ error: "User ID is required" });
  }

  const query = 'SELECT * FROM order_details WHERE status = "pending"'; // Filter by user_id
  db.query(query, [userId], (err, results) => {
    if (err) {
      console.error("Database query error:", err);
      return res.status(500).json({ error: "Internal server error" });
    }
    res.json(results);
  });
});

app.get("/api/underProcessOrders", (req, res) => {
  const userId = req.query.userId; // Retrieve userId from query parameters
  if (!userId) {
    return res.status(400).json({ error: "User ID is required" });
  }

  const query = 'SELECT * FROM order_details WHERE status = "underprocess" '; // Filter by user_id
  db.query(query, (err, results) => {
    if (err) {
      console.error("Database query error:", err);
      return res.status(500).json({ error: "Internal server error" });
    }
    res.json(results);
  });
});

app.get("/api/readytoDeliver", (req, res) => {
  const userId = req.query.userId; // Retrieve userId from query parameters
  if (!userId) {
    return res.status(400).json({ error: "User ID is required" });
  }

  const query = 'SELECT * FROM order_details WHERE status = "readytodeliver" '; // Filter by user_id
  db.query(query, (err, results) => {
    if (err) {
      console.error("Database query error:", err);
      return res.status(500).json({ error: "Internal server error" });
    }
    res.json(results);
  });
});

app.put("/api/updateDeliveryDate/:orderId", (req, res) => {
  const { orderId } = req.params;
  const { set_delivery_date } = req.body;

  if (!set_delivery_date) {
    return res.status(400).json({ error: "Delivery date is required" });
  }

  const query = "UPDATE order_details SET set_delivery_date = ? WHERE id = ?";
  db.query(query, [set_delivery_date, orderId], (err, result) => {
    if (err) {
      console.error("Error updating delivery date:", err);
      return res.status(500).json({ error: "Error updating delivery date" });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Order not found" });
    }

    res.json({ message: "Delivery date updated successfully" });
  });
});

app.get("/api/deliveredOrders", (req, res) => {
  const userId = req.query.userId; // Retrieve userId from query parameters
  if (!userId) {
    return res.status(400).json({ error: "User ID is required" });
  }

  const query = 'SELECT * FROM order_details WHERE status = "deliveredorders" '; // Filter by user_id
  db.query(query, (err, results) => {
    if (err) {
      console.error("Database query error:", err);
      return res.status(500).json({ error: "Internal server error" });
    }
    res.json(results);
  });
});

//SHOW ORDERS WHICH ARE CONFIRMED
app.get("/api/confirmedOrders", (req, res) => {
  const userId = req.query.userId; // Retrieve userId from query parameters
  if (!userId) {
    return res.status(400).json({ error: "User ID is required" });
  }

  const query =
    'SELECT * FROM order_details WHERE user_id = ? and status = "confirmed"';
  db.query(query, [userId], (err, results) => {
    if (err) throw err;
    res.json(results);
  });
});

app.get("/api/cartOrders", (req, res) => {
  const query = "SELECT * FROM orders WHERE status = 'confirmed'";
  pool.query(query, (error, results) => {
    if (error) {
      console.error(error);
      return res.status(500).send("Server error");
    }

    // Calculate subtotal and total
    let subtotal = results.reduce((acc, order) => acc + order.PRICE_AED, 0);
    let total = subtotal; // Add additional calculations if needed

    res.json({
      orders: results,
      subtotal,
      total,
    });
  });
});

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD, // Use empty string if no password
  database: process.env.DB_NAME,
});

module.exports = pool;

//REMOVE AND ORDER FROM DATABASE AND USERPRFILE
app.delete("/api/orders/:id", (req, res) => {
  const { id } = req.params;
  pool.query(
    "DELETE FROM order_details WHERE id = ?",
    [id],
    (error, results) => {
      if (error) {
        console.error("Error removing order:", error);
        return res.status(500).json({ error: error.message });
      }
      if (results.affectedRows === 0) {
        return res.status(404).json({ message: "Order not found" });
      }
      res.json({ message: "Order removed successfully" });
    }
  );
});

// Endpoint to generate an invoice and update the status of order_details
app.put("/api/orders/:id/generateInvoice", (req, res) => {
  const { id } = req.params;

  // Fetch order details
  const fetchOrderQuery =
    'SELECT * FROM order_details WHERE id = ? AND status = "pending"';
  db.query(fetchOrderQuery, [id], (err, orders) => {
    if (err) {
      console.error("Error fetching order details:", err);
      return res
        .status(500)
        .json({ error: "Error fetching order details", details: err });
    }

    if (orders.length === 0) {
      return res
        .status(404)
        .json({ message: "Order not found or already processed" });
    }

    // Update status to "confirmed" and calculate total amount
    const totalAmount = orders.reduce(
      (sum, order) => sum + order.PRICE_AED * order.QUANTITY,
      0
    );
    const trackingNumber = orders[0].order_tracking_number;

    const updateOrderDetailsQuery =
      'UPDATE order_details SET status = "confirmed" WHERE id = ? AND status = "pending"';
    db.query(updateOrderDetailsQuery, [id], (err, result) => {
      if (err) {
        console.error("Error updating order details:", err);
        return res
          .status(500)
          .json({ error: "Error updating order details", details: err });
      }

      if (result.affectedRows === 0) {
        return res
          .status(404)
          .json({ message: "Order not found or already processed" });
      }

      // You can also handle additional operations here, like sending an email with the invoice

      res.json({
        message: "Invoice generated and status updated to confirmed",
        totalAmount,
      });
    });
  });
});

// Cart Items
app.post("/api/addToCart", (req, res) => {
  const { order_tracking_number, order_state, PRICE_AED } = req.body;
  console.log("Received order:", req.body); // Log the incoming request

  if (!order_tracking_number || !order_state || !PRICE_AED) {
    console.error("Invalid request payload");
    return res.status(400).send("Invalid request payload");
  }

  const query =
    "INSERT INTO cart (order_tracking_number, order_state, PRICE_AED) VALUES (?, ?, ?)";
  db.query(
    query,
    [order_tracking_number, order_state, PRICE_AED],
    (error, results) => {
      if (error) {
        console.error("Database error:", error); // Log the error
        return res.status(500).send("Error adding order to cart");
      }
      res.status(200).send("Order added to cart");
    }
  );
});

// Show Cart Items
app.get("/api/cart", (req, res) => {
  const query = "SELECT * FROM cart";
  db.query(query, (error, results) => {
    if (error) {
      return res.status(500).send(error);
    }
    res.json(results);
  });
});

//Remove Cart Items

app.post("/api/removeFromCart", (req, res) => {
  const { order_tracking_number } = req.body;
  const query = "DELETE FROM cart WHERE order_tracking_number = ?";
  db.query(query, [order_tracking_number], (error, results) => {
    if (error) {
      return res.status(500).json({ error: "Failed to remove item from cart" });
    }
    res.status(200).json({ message: "Item removed from cart successfully" });
  });
});

app.get('/api/viewFullOrders', (req, res) => {
  const order_tracking_number = req.query.order_tracking_number;
  const query = 'SELECT * FROM orders WHERE order_tracking_number = ?';
  db.query(query, [order_tracking_number], (err, results) => {
    if (err) {
      console.error('Error fetching orders:', err);
      res.status(500).json({ error: 'Database error' });
      return;
    }
    res.json(results);
  });
});


//STRIPE PAYMENT GATEWAY
app.post('/api/topup', async (req, res) => {
  const { amount, currency, payment_method_id } = req.body;

  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency,
      payment_method: payment_method_id,
      confirm: true
    });

    const payment = {
      id: 1, // Replace with actual user ID
      amount: paymentIntent.amount / 100,
      currency: paymentIntent.currency,
      status: paymentIntent.status,
      payment_method: paymentIntent.payment_method_types[0]
    };

    db.query('INSERT INTO payments SET ?', payment, (err, result) => {
      if (err) {
        console.error('Failed to insert payment:', err);
        res.status(500).send('Failed to record payment.');
        return;
      }
      res.send({ success: true, paymentIntent });
    });
  } catch (err) {
    console.error('Payment failed:', err);
    res.status(500).send('Payment failed.');
  }
});

//Total Balance Amount

app.get('/api/totalAmounts', (req, res) => {
  const sql = `
    SELECT user_id, SUM(total_amount) AS total_amount
    FROM order_details
    GROUP BY user_id
  `;
  db.query(sql, (err, results) => {
    if (err) {
      console.error('Error fetching data:', err);
      res.status(500).send('Error fetching data');
      return;
    }
    res.json(results);
  });
});


app.get('/api/totalPaid', (req, res) => {
  const sql = `
    SELECT user_id, SUM(paid_amount) AS paid_amount
    FROM order_details
    GROUP BY user_id
  `;
  db.query(sql, (err, results) => {
    if (err) {
      console.error('Error fetching data:', err);
      res.status(500).send('Error fetching data');
      return;
    }
    res.json(results);
  });
});

app.get('/api/totalBalance', (req, res) => {
  const sql = ` SELECT user_id, (SUM(total_amount) - SUM(paid_amount)) AS balance FROM order_details
    GROUP BY user_id `;
  db.query(sql, (err, results) => {
    if (err) {
      console.error('Error fetching data:', err);
      res.status(500).send('Error fetching data');
      return;
    }
    res.json(results);
  });
});

app.get('/api/viewOrdersWithAmounts', (req, res) => {
  const order_tracking_number = req.query.order_tracking_number;
  const query = 'SELECT *, (total_amount - paid_amount) AS balance FROM order_details;';
  
  db.query(query, [order_tracking_number], (err, results) => {
    if (err) {
      console.error('Error fetching orders:', err);
      res.status(500).json({ error: 'Database error' });
      return;
    }
    res.json(results);
  });
});


app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
