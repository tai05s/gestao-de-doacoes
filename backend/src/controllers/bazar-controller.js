export class BazarController {
  constructor(service) {
    this.service = service;
  }

  list = async (req, res) => {
    const items = await this.service.list();
    res.json({ items });
  };

  applyChanges = async (req, res) => {
    await this.service.applyChanges(req.body?.upserts, req.body?.deletedIds);
    res.json({ ok: true });
  };
}
