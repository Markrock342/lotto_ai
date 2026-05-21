import Link from "next/link";
import { PageHeader, ui } from "@/components/ui";

const STEPS = [
  {
    n: 1,
    title: "ตั้งค่าบ้าน",
    href: "/settings",
    adminOnly: true,
    body: [
      "ราคาต่อชุด = ยอดรับเริ่มต้นต่อ 1 ชุด (เช่น 80 บาท) — ใช้เมื่อโพยไม่ระบุยอด",
      "อัตราจ่ายแยกประเภท 7 แบบ (4 ตรง, โต๊ด, 3 ตัว ฯลฯ)",
      "เพดานอั้นเลขทั้งบ้าน (ความเสี่ยง / จำนวนชุด)",
    ],
  },
  {
    n: 2,
    title: "จัดการผู้ใช้",
    href: "/users",
    adminOnly: true,
    body: [
      "เจ้ามือ 1 บัญชี · ลูกมือ staff1–3 (สูงสุด 5 คน)",
      "1 iPad ต่อ 1 บัญชี — ไม่แชร์ admin ให้ลูกมือ",
      "รีเซ็ตรหัสลูกมือได้ที่หน้าผู้ใช้",
    ],
  },
  {
    n: 3,
    title: "คีย์โพยจาก LINE",
    href: "/key",
    body: [
      "วางข้อความจาก LINE (แม่นสุด) หรือ「เลือกรูปโพย」จากแกลเลอรี — OCR อ่านลิสต์เลขแนวตั้ง",
      "ตรวจข้อความในกล่องก่อนกด「บันทึกโพย」",
      "ยอดรับ: จาก「ราคาต่อชุด」หรือยอดในข้อความ (เช่น 2355=1ชุด ราคา 80)",
      "ตารางสรุปต่อเลข: กดหัวคอลัมน์เรียง · เลือก checkbox หรือคลิกเลข · ลบหลายเลขพร้อมกัน",
      "โพยล่าสุด: เรียงคอลัมน์ · เลือกทั้งหมด · ลบหลายรายการพร้อมกัน · แก้ทีละรายการ",
      "กด「เพดาน」ตั้งอั้นเฉพาะเลข (เจ้ามือ)",
    ],
  },
  {
    n: 4,
    title: "ดูยอด",
    href: "/dashboard",
    body: ["ยอดรับงวดนี้ · Top เลขรับเยอะ · เลขเต็ม"],
  },
  {
    n: 5,
    title: "ออกผล",
    href: "/results",
    body: [
      "ใส่เลข 4 ตัวที่ออก",
      "1 ชุดถูกได้รางวัลใหญ่สุดที่ตรงเท่านั้น",
      "ไม่มีส่วนลด",
    ],
  },
  {
    n: 6,
    title: "งวดใหม่",
    href: "/key",
    body: ["หลังออกผลแล้วกด「งวดใหม่」ถึงจะรับโพยรอบถัดไป"],
  },
  {
    n: 7,
    title: "รายงาน",
    href: "/reports",
    body: ["ย้อนดูแต่ละงวด · กรองช่วงเวลา · ส่งออก CSV · พิมพ์บิล"],
  },
];

const LINE_FORMAT = `2355=1ชุด
2476=2ชุด
8210
8041
20 ชุด`;

export default function GuidePage() {
  return (
    <>
      <PageHeader title="วิธีใช้งาน" />

      <section className={`${ui.cardPad} mb-4`}>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          ระบบสำหรับเจ้ามือและลูกมือ — ลูกค้าส่งโพยทาง LINE · login แยกคน · ข้อมูลรวมงวดเดียวกัน
        </p>
      </section>

      <div className="space-y-3">
        {STEPS.map((step) => (
          <section key={step.n} className={ui.cardPad}>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                <span className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-xs text-white dark:bg-amber-500 dark:text-slate-900">
                  {step.n}
                </span>
                {step.title}
                {step.adminOnly && (
                  <span className="ml-2 text-xs font-normal text-slate-500">(เจ้ามือ)</span>
                )}
              </h2>
              <Link href={step.href} className="text-sm text-blue-600 dark:text-amber-400">
                ไปหน้านี้ →
              </Link>
            </div>
            <ul className="mt-3 list-inside list-disc space-y-1 text-sm text-slate-600 dark:text-slate-400">
              {step.body.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <section className={`${ui.cardPad} mt-4`}>
        <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200">
          ยอดรับคำนวณยังไง
        </h2>
        <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-slate-600 dark:text-slate-400">
          <li>
            <strong>ราคาต่อชุด</strong> ตั้งที่{" "}
            <Link href="/settings" className="text-blue-600 dark:text-amber-400">
              ตั้งค่า
            </Link>{" "}
            — ใช้กับเลขล้วน / ลิสต์ LINE ที่ไม่ระบุบาท
          </li>
          <li>
            โพยระบุยอดเอง เช่น <code className="font-mono">1234 50</code> → ยอดรับของเลขนั้น = 50
          </li>
          <li>
            <code className="font-mono">2355=2ชุด</code> → 2 ชุด × ราคาต่อชุด
          </li>
          <li>คอลัมน์「ยอดรับ」ในตาราง = ผลรวมบาทของเลขนั้นในงวดนี้</li>
        </ul>
      </section>

      <section className={`${ui.cardPad} mt-4`}>
        <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200">
          รูปแบบข้อความ LINE
        </h2>
        <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-slate-600 dark:text-slate-400">
          <li>
            <code className="font-mono">2355=1ชุด</code> → 1 ชุด × ราคาต่อชุด
          </li>
          <li>
            เลขล้วนหลายบรรทัด + ท้าย <code className="font-mono">20 ชุด</code> → ทุกเลขได้ 20
            ชุด
          </li>
          <li>เลขล้วนไม่มีท้าย → 1 ชุดต่อเลข</li>
          <li>
            เลือกรูปจากแกลเลอรี (บันทึกรูปจาก LINE ก่อน): เหมาะลิสต์แนวตั้งชัดๆ — ถ้าเลขเพี้ยนให้วางข้อความจาก LINE แทน
          </li>
        </ul>
        <pre className="mt-3 overflow-x-auto rounded-xl border border-slate-200 bg-slate-50 p-4 font-mono text-sm dark:border-slate-700 dark:bg-slate-800">
          {LINE_FORMAT}
        </pre>
      </section>

      <section className={`${ui.cardPad} mt-4`}>
        <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200">เรทจ่าย</h2>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          แยกประเภท 2/3/4 ตัว หน้า หลัง โต๊ด — ปรับได้ที่{" "}
          <Link href="/settings" className="text-blue-600 dark:text-amber-400">
            ตั้งค่า
          </Link>
          . ถูกหลายแบบพร้อมกันจ่ายแค่รางวัลใหญ่สุดที่ตรง
        </p>
      </section>

      <section className={`${ui.cardPad} mt-4`}>
        <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200">บิลและรายงาน</h2>
        <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-slate-600 dark:text-slate-400">
          <li>
            <Link href="/reports" className="text-blue-600 dark:text-amber-400">
              รายงาน
            </Link>
            — กรองวันนี้ / 7 วัน / เดือน · ส่งออก CSV
          </li>
          <li>พิมพ์บิล หรือ คัดลอกส่งลูกค้า — หน้าคีย์หวยหรือรายงาน</li>
        </ul>
      </section>
    </>
  );
}
