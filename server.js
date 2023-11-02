require("dotenv").config();
const express = require("express");
var bodyParser = require("body-parser");
const nodemailer = require("nodemailer");
const multer = require("multer");
const cors = require("cors");
const app = express();
const PORT = process.env.PORT || 4000;

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "noreply@crediseguro.co", // Cambia esto con tu dirección de correo electrónico de Gmail
    pass: "txphfoqdlbqkimtb", // Cambia esto con tu contraseña de correo electrónico de Gmail
  },
});

function getToken(req, res, next) {
  try {
    fetch(
      "https://crediseguro--pruebamc.sandbox.my.salesforce.com/services/oauth2/token?client_id=3MVG9pHRjzOBdkd.PTG4KZTEYvVgEVYPhrafzCAGf_YLvr7IFpTSrVmafCEWvXK3_c4X.psIam70iAiKwdAww&client_secret=234B11C328B13A48B8477F225F86F311CEC99D32F2D3E9CD6F979C206A7E9F17&username=config@crediseguro.co.pruebamc&password=Segucredi2020&grant_type=password",
      {
        method: "POST",
      }
    )
      .then((res) => res.json())
      .then((data) => {
        req.token = data.access_token;
        next();
      })
      .catch((err) => {
        res.status(500).json({
          error: `Ha ocurrido un problema con el servidor: ${err}`,
        });
      });
  } catch (error) {
    res.status(500).json({
      error: `Ha ocurrido un problema con el servidor: ${error}`,
    });
  }
}

app.use(bodyParser.json());

app.use(cors());

app.post("/send", (req, res) => {
  const { destinatario, asunto, mensaje } = req.body;

  const mailOptions = {
    from: "noreply@crediseguro.co",
    to: [destinatario[0], destinatario[1]],
    subject: asunto,
    text: mensaje,
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.error(error);
      res.status(500).send("Error al enviar el correo electrónico");
    } else {
      console.log("Correo electrónico enviado: " + info.response);
      res.status(200).send("Correo electrónico enviado con éxito");
    }
  });
});

app.post("/sendDocs", upload.any(), (req, res) => {
  const docs = req.files;

  const mailOptions = {
    from: "noreply@crediseguro.co",
    to: req.body.sender,
    subject: `${req.body.subject} ${req.body.document}`,
    text: req.body.message,
    attachments: docs.map((doc) => ({
      filename: `${
        doc.fieldname === "cc"
          ? "CC"
          : doc.fieldname === "policy"
          ? "POLIZA"
          : "OTRO"
      }-${
        doc.fieldname === "policy" && req.body.plate
          ? req.body.plate
          : req.body.document
      }.pdf`,
      content: doc.buffer,
      encoding: "base64",
    })),
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.error(error);
      res.status(500).send("Error al enviar el correo electrónico");
    } else {
      console.log("Correo electrónico enviado: " + info.response);
      res.status(200).send("Correo electrónico enviado con éxito");
    }
  });
});

app.post("/getLocation", getToken, (req, res) => {
  const { id_department, get_cities, get_departments } = req.body;

  try {
    const body = {
      quiereDepartamentos: get_departments,
      quiereCiudad: get_cities,
      IdParafiltrar: id_department,
    };
    fetch(
      "https://crediseguro--pruebamc.sandbox.my.salesforce.com/services/apexrest/V1/EnvioCiudad",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${req.token}`,
        },
        body: JSON.stringify(body),
      }
    )
      .then((res) => res.json())
      .then((data) => {
        res.json(data);
      })
      .catch((err) => {
        res.status(500).json({
          error: `Ha ocurrido un problema con el servidor: ${err}`,
        });
      });
  } catch (error) {
    res.status(500).json({
      error: `Ha ocurrido un problema con el servidor: ${error}`,
    });
  }
});

app.post("/sendFormNewCredit", getToken, (req, res) => {
  const {
    req_type,
    first_name,
    last_name,
    doc_type,
    num_document,
    birthdate,
    genre,
    email,
    phone,
    job,
    salary,
    city,
    address,
    num_policy,
    insurer_place,
    insurer,
    name_broker,
    nit_broker,
    broker,
    plate,
    init_term,
    total_annual,
    init_credit,
    num_shares,
  } = req.body;

  try {
    const body = {
      TipoDesolicitud: req_type,
      Name: first_name,
      Apellido: last_name,
      tipoDocumento: doc_type,
      NoDocumento: num_document,
      FechaNacimiento: birthdate,
      Genero: genre,
      Correo: email,
      Telefono: phone,
      Ocupacion: job,
      IngresosTitular: salary,
      IdCiudadresidencia: city,
      DireccionTitular: address,
      NoPoliza: num_policy,
      Sucursal: insurer_place,
      Aseguradoradelapoliza: insurer,
      NombreIntermediario: name_broker,
      NitIntermediario: nit_broker,
      AsesordelCredito: broker,
      Placa: plate,
      VigenciaInicial: init_term,
      PrimaTotal: total_annual,
      AbonoInicial: init_credit,
      NoCuotas: num_shares
    }
    fetch(
      "https://crediseguro--pruebamc.sandbox.my.salesforce.com/services/apexrest/V1/CreacionCredLead",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${req.token}`,
        },
        body: JSON.stringify(body),
      }
    ).then((res) => res.json()).then((data) => {
      res.status(200).json({
        message: "Información enviada exitosamente",
        status: 200
      })
    })
  } catch (error) {
    res.status(500).json({
      error: `Ha ocurrido un problema con el servidor: ${err}`
    })
  }
});

app.post("/sendFormRenovation", getToken, (req, res) => {
  const {
    req_type,
    first_name,
    last_name,
    doc_type,
    num_document,
    num_policy,
    insurer,
    name_broker,
    nit_broker,
    broker,
    total_annual,
    init_credit,
    num_shares,
  } = req.body;

  try {
    const body = {
      TipoDesolicitud: req_type,
      Name: first_name,
      Apellido: last_name,
      tipoDocumento: doc_type,
      NoDocumento: num_document,
      NoPoliza: num_policy,
      Aseguradoradelapoliza: insurer,
      NombreIntermediario: name_broker,
      NitIntermediario: nit_broker,
      AsesordelCredito: broker,
      PrimaTotal: total_annual,
      AbonoInicial: init_credit,
      NoCuotas: num_shares
    }
    fetch(
      "https://crediseguro--pruebamc.sandbox.my.salesforce.com/services/apexrest/V1/CreacionCredLead",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${req.token}`,
        },
        body: JSON.stringify(body),
      }
    ).then((res) => res.json()).then((data) => {
      res.status(200).json({
        message: "Información enviada exitosamente",
        status: 200
      })
    })
  } catch (error) {
    res.status(500).json({
      error: `Ha ocurrido un problema con el servidor: ${err}`
    })
  }
});


app.listen(PORT, () => {
  console.log(`Servidor en ejecución en el puerto ${PORT}`)
  ;
});
