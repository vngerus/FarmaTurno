export function obtenerUbicacion(): Promise<[number, number]> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('La geolocalización no está soportada por tu navegador.'));
      return;
    }

    const toCoords = (position: GeolocationPosition): [number, number] => [
      position.coords.latitude,
      position.coords.longitude
    ];

    navigator.geolocation.getCurrentPosition(
      (position) => resolve(toCoords(position)),
      () => {
        navigator.geolocation.getCurrentPosition(
          (position) => resolve(toCoords(position)),
          (error) => reject(error),
          { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
        );
      },
      { enableHighAccuracy: false, timeout: 4000, maximumAge: 5 * 60 * 1000 }
    );
  });
}
