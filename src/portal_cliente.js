const axios = require("axios");
const FormData = require("form-data");
const path = require("path");
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const region = "us-east-1";
const s3 = new S3Client({ region });
class Treble {
  generarId = (longitud) => {
    const caracteres = "0123456789abcdef";
    let resultado = "";
    for (let i = 0; i < longitud; i++) {
      resultado += caracteres.charAt(
        Math.floor(Math.random() * caracteres.length)
      );
    }
    return resultado;
  };

  subirPdfAS3 = async (pdfBase64, nameFile) => {
    const bufferPdf = Buffer.from(pdfBase64);
    const id_peticion = this.generarId(12);

    const params = {
      Bucket: "certificadosportales", // Reemplaza con el nombre de tu bucket
      Key: "bot/" + id_peticion + "_" + nameFile + ".pdf", // Ruta y nombre del archivo en S3
      Body: bufferPdf,
      ContentType: "application/pdf",
    };

    try {
      const command = new PutObjectCommand(params);
      await s3.send(command);

      // Construir la URL del archivo (esto asume que el bucket es público)
      const fileUrl = `https://${params.Bucket}.s3.${region}.amazonaws.com/${params.Key}`;
      return fileUrl;
    } catch (error) {
      console.error("Error al subir el archivo:", error);
      throw error;
    }
  };

  update = (id, data) => {
    axios.post("https://main.treble.ai/session/" + id + "/update", data, {
      headers: {
        "Content-Type": "application/json",
      },
    });
  };

  validaFormat = (fecha) => {
    const regex = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$/;
    return regex.test(fecha);
  };

  notificationChat = (phone, event) => {
    const bodyText = {
      text:
        "Se realizo un proceso en el bot cliente" +
        JSON.stringify({
          phone: phone,
          event: event,
        }),
    };

    axios({
      method: "POST",
      url: "https://chat.googleapis.com/v1/spaces/AAAAcWP8h6A/messages?key=AIzaSyDdI0hCZtE6vySjMm-WEfRq3CPzqKqqsHI&token=KEmIEVWDszYt6aWr74PF0nzPlMpGjGpXrj05r7xL0cs",
      headers: {
        "Content-Type": "application/json",
      },
      data: JSON.stringify(bodyText),
    });
  };

  validate = async (token, data) => {
    this.notificationChat(data.cellphone, "inicio nuevo proceso");

    const session_id = data.session_id;

    const documento = data.user_session_keys.find(
      (item) => item.key === "documento"
    );

    await axios({
      method: "GET",
      url: `https://crediseguro.my.salesforce.com/services/apexrest/V1/Info_Client/${documento.value}`,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    }).then(({ data }) => {
      if (data.IdCliente && data.Email !== null) {
        const valueEmail = data.Email;
        const valuePhone = data.Phone;
        const chars = 5; // Cantidad de caracters visibles

        const email_masked = valueEmail.replace(
          /[a-z0-9\-_.]+@/gi,
          (c) =>
            c.substr(0, chars) +
            c
              .split("")
              .slice(chars, -1)
              .map((v) => "*")
              .join("") +
            "@"
        );

        const mascaraLongitud = valuePhone.length - 4; // Dejaremos visibles los 2 extremos y ocultaremos el centro

        // Crea la máscara de asteriscos
        const mascara = "*".repeat(mascaraLongitud);

        // Construye el nuevo número con los extremos visibles y el centro oculto
        const phone_masked =
          valuePhone.substring(0, 2) +
          mascara +
          valuePhone.substring(valuePhone.length - 2);

          console.log(valuePhone);
          console.log(data.cellphone);

        //if (valuePhone == data.cellphone){
          this.update(session_id, {
            user_session_keys: [
              {
                key: "valida_documento_crediseguro",
                value: "1",
              },
              {
                key: "id_cliente",
                value: data.IdCliente,
              },
              {
                key: "nombre_cliente",
                value: data.Nombre,
              },
              {
                key: "telefono_cliente",
                value: phone_masked,
              },
              {
                key: "correo_cliente",
                value: email_masked,
              },
            ],
          });
        // }else {
        //   this.update(session_id, {
        //     user_session_keys: [
        //       {
        //         key: "valida_documento_crediseguro",
        //         value: "2",
        //       },
        //     ],
        //   });          
        // }

      } else {
        this.update(session_id, {
          user_session_keys: [
            {
              key: "valida_documento_crediseguro",
              value: "0",
            },
          ],
        });
      }
    });
    return "procesando";
  };

  credit = async (token, data, status) => {
    const session_id = data.session_id;

    let estado_credito = "";

    const documento = data.user_session_keys.find(
      (item) => item.key === "documento"
    );

    if (status === "pys") {
      // paz y salvo
      estado_credito = {
        Estado1: "Paz y Salvo",
        Estado2: "",
        Estado3: "",
        Estado4: "",
        Estado5: "",
        Estado6: "",
        Estado7: "",
        Estado8: "",
        Estado9: "",
      };
    } else if (status === "ec" || status === "fmp") {
      // estado credito, formas y medios de pago
      estado_credito = {
        Estado1: "Vigente",
        Estado2: "Devuelto",
        Estado3: "En proceso",
        Estado4: "Cancelado",
        Estado5: "Anulado",
        Estado6: "Proceso de Cancelacion Avisado",
        Estado7: "En proceso de cancelacion",
        Estado8: "Por desembolsar",
        Estado9: "",
      };
    } else if (status === "ct") {
      // certificado tributario
      estado_credito = {
        Estado1: "Vigente",
        Estado2: "Devuelto",
        Estado3: "En proceso",
        Estado4: "Cancelado",
        Estado5: "Anulado",
        Estado6: "Proceso de Cancelacion Avisado",
        Estado7: "En proceso de cancelacion",
        Estado8: "Por desembolsar",
        Estado9: "Paz y Salvo",
      };
    } else if (status === "ic") {
      // informacion coberturas
      estado_credito = {
        Estado1: "Vigente",
        Estado2: "En proceso",
        Estado3: "",
        Estado4: "",
        Estado5: "",
        Estado6: "",
        Estado7: "",
        Estado8: "",
        Estado9: "",
      };
    } else if (status === "vig") {
      // informacion coberturas
      estado_credito = {
        Estado1: "Vigente",
        Estado2: "",
        Estado3: "",
        Estado4: "",
        Estado5: "",
        Estado6: "",
        Estado7: "",
        Estado8: "",
        Estado9: "",
      };
    }

    axios
      .post(
        "https://crediseguro.my.salesforce.com/services/apexrest/V1/CreditosTreble",
        {
          CCTomador: documento.value,
          EstadoCredito: [estado_credito],
        },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      )
      .then((respuesta) => {

        if (
          !respuesta.data.creditosEncontrados ||
          respuesta.data.creditosEncontrados.length === 0
        ) {
          console.log("No se encontraron créditos");
          this.update(session_id, {
            user_session_keys: [
              {
                key: "credito_crediseguro",
                value: "0",
              },
            ],
          });
        } else {

          console.log("se encontraron créditos");
          const salida = respuesta.data.creditosEncontrados
            .map((cred) => {
              return `*• No. de Crédito: ${cred.NombreCredito}*
              *•	Aseguradora:* ${cred.aseguradora}
              *•	Línea:* ${cred.Linea}
              *•	Vigencias:* ${cred.vigenciaInicial} - ${cred.vigenciaFinal}
              *•	Placa:* ${cred.Placa}
              *•	Estado del crédito:* ${cred.EstadoCredito}`;
            })
            .join("\n\n");

          this.update(session_id, {
            user_session_keys: [
              { key: "credito_crediseguro", value: "1" },
              { key: "creditos", value: salida },
              ...respuesta.data.creditosEncontrados.map((cred) => ({
                key: cred.NombreCredito,
                value: cred.IdCredito,
              })),
              ...respuesta.data.creditosEncontrados.map((cred) => ({
                key: "VALOR-" + cred.NombreCredito,
                value: "'" + cred.ValorFinanciado + "'",
              })),
            ],
          });          
        }          
      })
      .catch((error) => {
        console.log("error");
        console.log(error);

        this.notificationChat(data.cellphone, error);

        this.update(session_id, {
          user_session_keys: [
            {
              key: "credito_crediseguro",
              value: "0",
            },
          ],
        });
      });

    return "procesando";
  };

  creditRenovation = async (token, data) => {
    const session_id = data.session_id;

    const documento = data.user_session_keys.find(
      (item) => item.key === "documento"
    );

    axios
      .post(
        "https://crediseguro.my.salesforce.com/services/apexrest/V1/CreditosTreble",
        {
          CCTomador: documento.value,
          EstadoCredito: [
            {
              Estado1: "Paz y Salvo",
              Estado2: "Vigente",
              Estado3: "En proceso de cancelacion",
              Estado4: "",
              Estado5: "",
              Estado6: "",
              Estado7: "",
              Estado8: "",
              Estado9: "",
            },
          ],
        },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      )
      .then((respuesta) => {
        const salida = respuesta.data.creditosEncontrados
          .map((cred) => {
            return `*• No. de Crédito: ${cred.NombreCredito}*
            *•	Aseguradora:* ${cred.aseguradora}
            *•	Línea:* ${cred.Linea}
            *•	Vigencias:* ${cred.vigenciaInicial} - ${cred.vigenciaFinal}
            *•	Placa:* ${cred.Placa}
            *•	Estado del crédito:* ${cred.EstadoCredito}
            *Datos del Intermediario:*
            → Nombre: ${cred.IntermediarioNombre} 
            → Asesor: ${cred.NombreAsesorComercial}
            → Correo: ${cred.CorreoAsesorComercial} 
            → Celular: ${cred.CelularAsesorComercial}`;
          })
          .join("\n\n");

        this.update(session_id, {
          user_session_keys: [
            { key: "credito_crediseguro", value: "1" },
            { key: "creditos", value: salida },
            ...respuesta.data.creditosEncontrados.map((cred) => ({
              key: cred.NombreCredito,
              value: cred.IdCredito,
            })),
          ],
        });
      })
      .catch((error) => {
        console.log("error");
        console.log(error);
        this.notificationChat(data.cellphone, error);

        this.update(session_id, {
          user_session_keys: [
            {
              key: "credito_crediseguro",
              value: "0",
            },
          ],
        });
      });

    return "procesando";
  };

  certificate = async (token, data, tipo) => {
    const session_id = data.session_id;

    const numero_credito = data.user_session_keys.find(
      (item) => item.key === "numero_credito"
    );

    if (numero_credito.value) {
      const id_credito = data.user_session_keys.find(
        (item) => item.key === "CRED-" + numero_credito.value
      );

      if (id_credito) {
        const payload = {
          idCredito: id_credito.value,
          tipoDoc: tipo, //"Estado_del_credito",
        };

        const config = {
          method: "post",
          maxBodyLength: Infinity,
          url: "https://portal.back-crediseguro.com/api/export-certificate",
          headers: {
            "Content-Type": "application/json",
            Authorization:
              "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI2NmFhYThkY2EzOTdlYzMwMzVhOTg1Y2IiLCJ1c2VySWQiOiIwMDEzaDAwMDAwRGdWNVNBQVYiLCJkb2N1bWVudCI6Ijk5OTAzODYwOCIsIm5hbWUiOiJBZG1pbmlzdHJhZG9yIiwiZW1haWwiOiJjYXJ0ZXJhQGNhdmNhLmNvbS5jbyIsInBob25lIjoiMzIwNDc3NDEzOCIsInByb2ZpbGUiOiJBZG1pbiIsImlhdCI6MTc0MzQzNDkzMCwiZXhwIjoxNzQ2MDI2OTMwfQ.l_3ZHqluWYovAHFbZHGQAn9PexWME9l-1GjQ-B2t6d4",
          },
          data: JSON.stringify(payload),
          responseType: "arraybuffer", // Esto hace que Axios devuelva un ArrayBuffer
        };

        console.log(config);

        try {
          const nameFile = tipo + ": CRED-" + numero_credito.value;
          const response = await axios.request(config);

          const fileUrl = await this.subirPdfAS3(response.data, nameFile);
          this.update(session_id, {
            user_session_keys: [
              {
                key: "certificado_credito",
                value: "1",
              },
              {
                key: "certificado_credito_url",
                value: fileUrl,
              },
            ],
          });
        } catch (error) {
          this.notificationChat(data.cellphone, error);

          this.update(session_id, {
            user_session_keys: [
              {
                key: "certificado_credito",
                value: "0",
              },
            ],
          });
        }
      } else {
        this.update(session_id, {
          user_session_keys: [
            {
              key: "certificado_credito",
              value: "0",
            },
          ],
        });
      }
    } else {
      this.update(session_id, {
        user_session_keys: [
          {
            key: "certificado_credito",
            value: "0",
          },
        ],
      });
    }

    return "procesando";
  };

  video_tutorial = async (data) => {
    const session_id = data.session_id;

    this.update(session_id, {
      user_session_keys: [
        {
          key: "url_video",
          value: "https://www.youtube.com/watch?v=h2b-KFcKzUs&t=33s",
        },
      ],
    });

    return "procesando";
  };

  createCase = async (token, data) => {
    const session_id = data.session_id;

    const numero_credito = data.user_session_keys.find(
      (item) => item.key === "numero_credito"
    );

    if (numero_credito.value) {
      const id_credito = data.user_session_keys.find(
        (item) => item.key === "CRED-" + numero_credito.value
      );

      axios
        .post(
          "https://crediseguro.my.salesforce.com/services/apexrest/V1/CrearCaso",
          {
            idCredito: id_credito.value,
          },
          {
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          }
        )
        .then((respuesta) => {
          const response = respuesta.data;

          this.update(session_id, {
            user_session_keys: [
              { key: "numero_radicado", value: response.RadicadoCaso },
            ],
          });
        })
        .catch((error) => {
          console.log("error");
          console.log(error);
          this.notificationChat(data.cellphone, error);

          this.update(session_id, {
            user_session_keys: [
              {
                key: "numero_radicado",
                value: "0",
              },
            ],
          });
        });
    } else {
      this.update(session_id, {
        user_session_keys: [
          {
            key: "numero_radicado",
            value: "0",
          },
        ],
      });
    }

    return "procesando";
  };

  createPac = async (token, data) => {
    const session_id = data.session_id;

    const numero_credito = data.user_session_keys.find(
      (item) => item.key === "numero_credito"
    );

    const fecha_acuerdo = data.user_session_keys.find(
      (item) => item.key === "fecha_acuerdo"
    );

    if (this.validaFormat(fecha_acuerdo.value)) {
      if (numero_credito.value) {
        const id_credito = data.user_session_keys.find(
          (item) => item.key === "CRED-" + numero_credito.value
        );

        const valor_credito = data.user_session_keys.find(
          (item) => item.key === "VALOR-CRED-" + numero_credito.value
        );

        axios
          .post(
            "https://crediseguro.my.salesforce.com/services/apexrest/V1/CreacionPAC",
            {
              idCredito: id_credito.value,
              fechaPAC: fecha_acuerdo.value,
            },
            {
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
            }
          )
          .then((respuesta) => {
            const response = respuesta.data;

            if (response.estadoPAC === "PAC Creado") {
              const salida = `
              "CRED - "${numero_credito.value}
              Fecha máxima para realizar el pago: ${fecha_acuerdo.value}
              Valor a pagar: ${valor_credito.value}`;

              this.update(session_id, {
                user_session_keys: [
                  { key: "estado_pac", value: "1" },
                  { key: "salida_pac", value: salida },
                ],
              });
            } else {
              const salida =
                "La fecha indicada supera la política permitida para liquidación de PAC.";

              this.update(session_id, {
                user_session_keys: [
                  { key: "estado_pac", value: "3" },
                  { key: "salida_pac", value: salida },
                ],
              });
            }
          })
          .catch((error) => {
            console.log("error");
            console.log(error);

            this.notificationChat(data.cellphone, error);

            this.update(session_id, {
              user_session_keys: [
                {
                  key: "estado_pac",
                  value: "0",
                },
              ],
            });
          });
      } else {
        this.update(session_id, {
          user_session_keys: [
            {
              key: "estado_pac",
              value: "0",
            },
          ],
        });
      }
    } else {
      this.update(session_id, {
        user_session_keys: [
          {
            key: "estado_pac",
            value: "2",
          },
        ],
      });
    }
    return "procesando";
  };
}


module.exports = new Treble();
