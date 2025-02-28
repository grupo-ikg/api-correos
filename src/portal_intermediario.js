const axios = require("axios");
const FormData = require("form-data");
const path = require("path");
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

  update = (id, data) => {
    axios.post("https://main.treble.ai/session/" + id + "/update", data, {
      headers: {
        "Content-Type": "application/json",
      },
    });
  };

  autentication = async (data) => {
    const session_id = data.session_id;
    const claveInicio = data.user_session_keys.find(
      (item) => item.key === "clave_inicio"
    );
    const nitInicio = data.user_session_keys.find(
      (item) => item.key === "nit_inicio"
    );

    await axios({
      method: "POST",
      url: "http://localhost:3001/api/login",
      headers: {
        "Content-Type": "application/json",
      },
      data: JSON.stringify({
        document: nitInicio.value,
        password: Buffer.from(claveInicio.value).toString("base64"),
      }),
    })
      .then(({ data }) => {
        this.update(session_id, {
          user_session_keys: [
            {
              key: "autenticacion_crediseguro",
              value: "1",
            },
            {
              key: "token_crediseguro",
              value: data.data,
            },
          ],
        });
      })
      .catch((error) => {
        this.update(session_id, {
          user_session_keys: [
            {
              key: "autenticacion_crediseguro",
              value: "0",
            },
          ],
        });
      });

    return "procesando";
  };

  validate = async (data) => {
    const session_id = data.session_id;
    const id_peticion = this.generarId(12);

    const token_crediseguro = data.user_session_keys.find(
      (item) => item.key === "token_crediseguro"
    );

    const numero_documento_1 = data.user_session_keys.find(
      (item) => item.key === "numero_documento_1"
    );

    let id_intermediario = await axios
      .put(
        "http://localhost:3001/api/credit-ocr",
        {
          vig_inicial: null,
          sexo: null,
          prima_total: null,
          placa: null,
          ocupacion_titular_credito: null,
          numero_doc: null,
          nombres: null,
          no_poliza: null,
          no_cuotas: null,
          linea: null,
          ingresos_titular_del_credito: null,
          id: id_peticion,
          fecha_nacimiento: null,
          fecha_expedicion: null,
          estado_civil: null,
          departamento_nacimiento: null,
          departamento_expedicion: null,
          correo_electronico: null,
          ciudad_nacimiento: null,
          ciudad_expedicion: null,
          cel_titular_credito: null,
          asesor_intermediario: null,
          apellidos: "Treble",
          abono_inicial: null,
          id_sucursal: null,
          ciudad_residencia: null,
          direccion_residencia: null,
          es_renovacion: false,
          vehiculo0kms: false,
        },
        {
          headers: {
            authorization: "Bearer " + token_crediseguro.value,
            "content-type": "application/json",
          },
        }
      )
      .then((response) => {
        return response.data.data.IdIntermediario;
      })
      .catch((error) => {
        return "0";
      });

    axios
      .get(
        "https://crediseguro-back.click/getDocument/" + numero_documento_1.value
      )
      .then((response) => {
        if (response.data) {
          this.update(session_id, {
            user_session_keys: [
              {
                key: "valida_documento_crediseguro",
                value: "1",
              },
              {
                key: "id_peticion_crediseguro",
                value: id_peticion,
              },
              {
                key: "id_intermediario_crediseguro",
                value: id_intermediario,
              },
            ],
          });
        } else {
          this.update(session_id, {
            user_session_keys: [
              {
                key: "valida_documento_crediseguro",
                value: "2",
              },
              {
                key: "id_peticion_crediseguro",
                value: id_peticion,
              },
              {
                key: "id_intermediario_crediseguro",
                value: id_intermediario,
              },
            ],
          });
        }
      })
      .catch((error) => {
        console.log(error);
        this.update(session_id, {
          user_session_keys: [
            {
              key: "autenticacion_crediseguro",
              value: "0",
            },
            {
              key: "id_peticion_crediseguro",
              value: "",
            },
            {
              key: "id_intermediario_crediseguro",
              value: "",
            },
          ],
        });
      });

    return "procesando";
  };

  uploadDocument = async (data) => {
    const session_id = data.session_id;

    const archivo_documento = data.user_session_keys.find(
      (item) => item.key === "archivo_documento"
    );

    if (!archivo_documento) {
      console.error("No se encontró 'archivo_documento' en user_session_keys.");
      this.update(session_id, {
        user_session_keys: [
          {
            key: "documento_cargado_crediseguro",
            value: "0",
          },
        ],
      });
    } else if (!archivo_documento.value) {
      console.error(
        "'archivo_documento' está presente pero no contiene un valor."
      );
      this.update(session_id, {
        user_session_keys: [
          {
            key: "documento_cargado_crediseguro",
            value: "0",
          },
        ],
      });
    } else {
      const tipo_documento_1 = data.user_session_keys.find(
        (item) => item.key === "tipo_documento_1"
      );
      const id_peticion_crediseguro = data.user_session_keys.find(
        (item) => item.key === "id_peticion_crediseguro"
      );
      const id_intermediario_crediseguro = data.user_session_keys.find(
        (item) => item.key === "id_intermediario_crediseguro"
      );
      const formato_documento = data.user_session_keys.find(
        (item) => item.key === "formato_documento"
      );

      const fileName = path.basename(new URL(archivo_documento.value).pathname);

      // Descargar el archivo como stream
      const response = await axios.get(archivo_documento.value, {
        responseType: "stream",
      });

      // enviar correo
      const formMail = new FormData();
      formMail.append(
        "message",
        "Hola, has cedula una poliza de un cliente desde nuestro bot de intermediarios. Abre este correo para revisarlo."
      );
      formMail.append("sender", "desarrolladorsc@cavca.com.co");
      formMail.append("subject", "Solicitud de Crédito Nuevo OCR - BOT");
      formMail.append("document", id_peticion_crediseguro.value);
      formMail.append("cc", response.data, {
        filename: fileName,
        contentType: "application/pdf",
      });

      // Realizar la solicitud POST
      axios
        .post("https://crediseguro-back.click/sendDocs", formMail)
        .then((response) => {
          console.log(response.data);
        })
        .catch((error) => {
          console.error(error);
        });

      // Crear el form-data y agregar el archivo y demás campos
      const form = new FormData();
      form.append("file", response.data, {
        filename: fileName,
        contentType: "application/pdf",
      });
      form.append("type_doc", formato_documento.value);
      form.append("id", id_peticion_crediseguro.value);
      form.append("insurance", tipo_documento_1.value);
      form.append("id_intermediario", id_intermediario_crediseguro.value);

      // Configurar la URL de envío y las cabeceras necesarias
      const sendFileUrl =
        "https://sendfile.crediseguro-back.click/send_file?_id=" +
        id_peticion_crediseguro.value +
        "&insurance=" +
        tipo_documento_1.value;

      const result = await axios.post(sendFileUrl, form);

      this.update(session_id, {
        user_session_keys: [
          {
            key: "documento_cargado_crediseguro",
            value: "1",
          },
        ],
      });

      console.log("Archivo enviado exitosamente:", result.data);
    }

    return "procesando";
  };

  uploadPolicy = async (data) => {
    const session_id = data.session_id;
    let insurance = "";
    let type_doc = "";

    const archivo_poliza = data.user_session_keys.find(
      (item) => item.key === "archivo_poliza"
    );

    console.log(archivo_poliza);

    if (!archivo_poliza) {
      console.error("No se encontró 'archivo_poliza' en user_session_keys.");
      this.update(session_id, {
        user_session_keys: [
          {
            key: "poliza_cargada_crediseguro",
            value: "0",
          },
        ],
      });
    } else if (!archivo_poliza.value) {
      console.error(
        "'archivo_poliza' está presente pero no contiene un valor."
      );
      this.update(session_id, {
        user_session_keys: [
          {
            key: "poliza_cargada_crediseguro",
            value: "0",
          },
        ],
      });
    } else {
      console.log("entrando a subir poliza");
      const aseguradora = data.user_session_keys.find(
        (item) => item.key === "aseguradora"
      );

      if (aseguradora.value == "AXA Colpatria Seguros S.A") {
        insurance = "AXA-0013h00000GiwbUAAR";
        type_doc = "other";
      } else if (aseguradora.value == "Compañía Seguros Mundial S.A.") {
        insurance = "MUNDIAL-0013h00000GiwbWAAR";
        if (mundial_formato_1 == "Si") {
          type_doc = "formato_1";
        } else if (mundial_formato_1 == "No" && mundial_formato_2 == "Si") {
          type_doc = "formato_2";
        }
      } else if (aseguradora.value == "Seguros Bolivar S.A.") {
        insurance = "BOLIVAR-0013h00000GiwbdAAB";
        type_doc = "other";
      } else if (aseguradora.value == "La Equidad Seguros Generales S.A.") {
        insurance = "EQUIDAD-0013h00000DgV5TAAV";
        if (equidad_formato_1 == "Si") {
          type_doc = "formato_1";
        } else if (equidad_formato_1 == "No" && equidad_formato_2 == "Si") {
          type_doc = "formato_2";
        }
      } else if (aseguradora.value == "SBS Seguros Colombia S.A.") {
        insurance = "SBS";
        type_doc = "SBS-0013h00000GiwbcAAB";
      } else if (aseguradora.value == "Aseguradora Solidaria de Colombia") {
        insurance = "SOLIDARIA-0013h00000GiwbTAAR";
        if (equidad_formato_1 == "Si") {
          type_doc = "formato_1";
        } else if (equidad_formato_1 == "No" && equidad_formato_2 == "Si") {
          type_doc = "formato_2";
        } else if (
          equidad_formato_1 == "No" &&
          equidad_formato_2 == "No" &&
          equidad_formato_3 == "Si"
        ) {
          type_doc = "formato_3";
        } else if (
          equidad_formato_1 == "No" &&
          equidad_formato_2 == "No" &&
          equidad_formato_3 == "No" &&
          equidad_formato_4 == "Si"
        ) {
          type_doc = "formato_4";
        }
      } else if (aseguradora.value == "HDI Seguros S.A.") {
        insurance = "HDI-0013h00000DgTUOAA3";
        type_doc = "other";
      } else if (aseguradora.value == "La Previsora S.A.") {
        insurance = "PREVISORA-0013h00000GiwbYAAR";
        type_doc = "other";
      } else if (aseguradora.value == "Allianz Colombia S.A.") {
        insurance = "ALLIANZ-0013h00000DgPwsAAF";
        type_doc = "other";
      } else if (
        aseguradora.value == "Mapfre Seguros Generales de Colombia S.A."
      ) {
        insurance = "MAPFRE-0013h00000GiwbaAAB";
        type_doc = "other";
      } else if (aseguradora.value == "Seguros Generales Suramericana S.A.") {
        insurance = "SURA-0013h00000GiwbfAAB";
        if (sura_formato_1 == "Si") {
          type_doc = "formato_1";
        } else if (sura_formato_1 == "No" && sura_formato_2 == "Si") {
          type_doc = "formato_2";
        }
      } else if (aseguradora.value == "Zurich Colombia Seguros S.A.") {
        insurance = "ZURICH-0013h00000GiwbbAAB";
        type_doc = "other";
      } else if (aseguradora.value == "Liberty Seguros S.A.") {
        insurance = "LIBERTY-0013h00000GiwbZAAR";
        type_doc = "other";
      }

      const id_peticion_crediseguro = data.user_session_keys.find(
        (item) => item.key === "id_peticion_crediseguro"
      );
      const id_intermediario_crediseguro = data.user_session_keys.find(
        (item) => item.key === "id_intermediario_crediseguro"
      );

      const fileName = path.basename(new URL(archivo_poliza.value).pathname);

      // Descargar el archivo como stream
      const response = await axios.get(archivo_poliza.value, {
        responseType: "stream",
      });

      // enviar correo
      const formMail = new FormData();
      formMail.append(
        "message",
        "Hola, has recibido una cedula de un cliente desde nuestro bot de intermediarios. Abre este correo para revisarlo"
      );
      formMail.append("sender", "desarrolladorsc@cavca.com.co");
      formMail.append("subject", "Solicitud de Crédito Nuevo OCR - BOT");
      formMail.append("document", id_peticion_crediseguro.value);
      formMail.append("policy", response.data, {
        filename: fileName,
        contentType: "application/pdf",
      });

      // Crear el form-data y agregar el archivo y demás campos
      const form = new FormData();
      form.append("file", response.data, {
        filename: fileName,
        contentType: "application/pdf",
      });
      form.append("type_doc", type_doc);
      form.append("id", id_peticion_crediseguro.value);
      form.append("insurance", insurance);
      form.append("id_intermediario", id_intermediario_crediseguro.value);

      console.log(form);

      // Configurar la URL de envío y las cabeceras necesarias
      const sendFileUrl =
        "https://sendfile.crediseguro-back.click/send_file?_id=" +
        id_peticion_crediseguro.value +
        "&insurance=" +
        insurance;

      const result = await axios.post(sendFileUrl, form);

      this.update(session_id, {
        user_session_keys: [
          {
            key: "poliza_cargada_crediseguro",
            value: "1",
          },
        ],
      });

      console.log("Archivo enviado exitosamente:", result.data);
    }

    return "procesando";
  };

  uploadExhibit = async (data) => {
    const session_id = data.session_id;

    const token_crediseguro = data.user_session_keys.find(
      (item) => item.key === "token_crediseguro"
    );

    const archivo_anexo = data.user_session_keys.find(
      (item) => item.key === "archivo_anexo"
    );

    if (!archivo_anexo) {
      console.error("No se encontró 'archivo_anexo' en user_session_keys.");
      this.update(session_id, {
        user_session_keys: [
          {
            key: "anexo_cargado_crediseguro",
            value: "0",
          },
        ],
      });
    } else if (!archivo_anexo.value) {
      console.error("'archivo_anexo' está presente pero no contiene un valor.");
      this.update(session_id, {
        user_session_keys: [
          {
            key: "anexo_cargado_crediseguro",
            value: "0",
          },
        ],
      });
    } else {

      const id_peticion_crediseguro = data.user_session_keys.find(
        (item) => item.key === "id_peticion_crediseguro"
      );

      ;
      const fileName = path.basename(new URL(archivo_anexo.value).pathname);

      const fileResponse = await axios.get(archivo_anexo.value, {
        responseType: "arraybuffer",
      });

      // 2. Convertir el contenido a base64
      const base64File = Buffer.from(fileResponse.data, "binary").toString(
        "base64"
      );

      // 3. Preparar el payload con el contenido base64
      const payload = {
        id: id_peticion_crediseguro.value,
        name: fileName,
        body: base64File,
      };

      // 4. Ejecutar la solicitud POST a la API
      const result = await axios.post(
        "https://portal.back-crediseguro.com/api/upload-document",
        payload,
        {
          headers: {
            "authorization": "Bearer" + token_crediseguro.value,
            "content-type": "application/json",
          },
        }
      );

      this.update(session_id, {
        user_session_keys: [
          {
            key: "anexo_cargado_crediseguro",
            value: "1",
          },
        ],
      });

      console.log("Archivo enviado exitosamente:", result.data);
    }

    return "procesando";
  };
}

module.exports = new Treble();
