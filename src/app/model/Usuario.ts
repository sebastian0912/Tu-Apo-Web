
export let urlBack: { url: string } = {
    url: "https://formulario.tsservicios.co"
    //url: 'http://10.10.10.60:4545'
    // url: 'http://127.0.0.1:8000' // Puedes descomentar esta línea y comentar la anterior para cambiar la URL del backend.
};

export interface Usuario {
    numero_de_documento: string;
    primer_nombre: string;
    segundo_nombre: string;
    primer_apellido: string;
    segundo_apellido: string;
    celular: string;
    localizacion: string;
    edad: string;
    tipodedocumento: string;
    correo_electronico: string;
    avatar: string;
    empladode: string;
    sucursalde: string;
    rol: string;
    password: string;
    username: string;
    EstadoQuincena: boolean;
    EstadoSolicitudes: boolean;
}
