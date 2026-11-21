export function buildSelectReport(options?: {
  ids?: Boolean;
  relations?: Boolean;
}) {
  const select: any = {
    id: true,
    address: true,
    reported_name: true,
    reported_lastname: true,
    reported_dni: true,
    reported_job: true,
    reported_regime: true,
    service_start: true,
    assigned_zone: true,
    assigned_sector: true,
    assigned_radio: true,
    code: true,
    date: true,
    bodycam_user: true,
    bodycam_supervisor: true,
    header: true,
    latitude: true,
    longitude: true,
    link: true,
    media: true,
    message: true,
    process: true,
    shift: true,
    evidences: {
      where: { deleted_at: null },
    },
    deleted_at: true,
  };
  if (options?.ids)
    Object.assign(select, {
      bodycam_id: true,
      jurisdiction_id: true,
      lack_id: true,
      offender_id: true,
      subject_id: true,
      user_id: true,
    });
  if (options?.relations)
    Object.assign(select, {
      absences: {
        select: { start: true, end: true, mode: true },
      },
      bodycam: {
        select: { id: true, name: true, cam: true },
      },
      jurisdiction: {
        select: { id: true, name: true },
      },
      lack: {
        select: { id: true, name: true },
      },
      offender: {
        select: {
          id: true,
          name: true,
          lastname: true,
          dni: true,
          job: true,
          regime: true,
          shift: true,
          subgerencia: true,
        },
      },
      subject: {
        select: { id: true, name: true },
      },
      user: {
        select: {
          id: true,
          username: true,
          name: true,
          lastname: true,
          email: true,
          dni: true,
          phone: true,
        },
      },
    });
  return select;
}
