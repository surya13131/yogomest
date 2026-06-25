'use client';
import React from 'react';
import { useRouter } from 'next/navigation'; // Added for navigation
import handImage from '../assest/hand.png';
import Hom3 from '../HomeThree/page';

const PopularRoutesAndContact: React.FC = () => {
  const router = useRouter();

  const routes = [
    { route: 'Bangalore - Chennai', source: 'Bangalore', dest: 'Chennai', first: '19:00', last: '23:30', count: 15, fare: 600 },
    { route: 'Bangalore - Coimbatore', source: 'Bangalore', dest: 'Coimbatore', first: '19:00', last: '23:30', count: 15, fare: 600 },
    { route: 'Bangalore - Ooty', source: 'Bangalore', dest: 'Ooty', first: '19:00', last: '23:30', count: 15, fare: 600 },
    { route: 'Bangalore - Hyderabad', source: 'Bangalore', dest: 'Hyderabad', first: '19:00', last: '23:30', count: 15, fare: 600 },
    { route: 'Bangalore - Mysore', source: 'Bangalore', dest: 'Mysore', first: '19:00', last: '23:30', count: 15, fare: 600 },
  ];

  // Helper function to handle navigation
  const handleBooking = (source: string, dest: string) => {
    const today = new Date().toISOString().split('T')[0];

    // Special case for Bangalore → Mysore
    if (source === "Bangalore" && dest === "Mysore") {
      const queryParams = new URLSearchParams({
        sourceName: "Bangalore",
        destName: "Mysore",
        vrlSourceId: "757",
        vrlDestId: "3509",
        srsSourceId: "134",
        srsDestId: "981",
        ezeeSourceCode: "STF3OEX206",
        ezeeDestCode: "",
        date: today,
      });

      router.push(`/bus-list?${queryParams.toString()}`);
      return;
    }

    // Existing logic for all other routes
    const queryParams = new URLSearchParams({
      sourceName: source,
      destName: dest,
      date: today
    });
    
    router.push(`/bus-list?${queryParams.toString()}`);
  };

  return (
    <main>
      {/* Mobile styling added to shrink text and fit all columns */}
      <style>{`
        @media (max-width: 768px) {
          .mobile-table-resize th, 
          .mobile-table-resize td {
            font-size: 11px !important;
            padding: 8px 4px !important;
            white-space: nowrap !important;
          }
          .mobile-table-resize .route-text {
            white-space: normal !important;
            min-width: 80px;
          }
          .mobile-btn-resize {
            font-size: 10px !important;
            padding: 6px 4px !important;
            width: 100% !important;
          }
        }
      `}</style>

      <div className="w-100 bg-white py-5">
        <div className='site-wrapper'>
        {/* --- POPULAR ROUTES TABLE --- */}
        {/* Changed px-5 to px-2 px-md-5 to increase box size on mobile */}
        <div className="container-fluid px-2 px-md-5">
          <div className="text-center mb-4">
            <h2 className="fw-bold mb-1" style={{ color: '#002B5C' }}>
              Top 5 Popular Bus Routes from Bangalore
            </h2>
            <div
              className="mx-auto mb-4"
              style={{ width: '60px', height: '3px', backgroundColor: '#00B4D8' }}
            ></div>
          </div>

          <div className="custom-table-wrapper shadow-sm table-80 mx-auto">
            <div className="table-responsive">
              <table className="table table-striped align-middle mb-0 mobile-table-resize">
                <thead className="custom-table-header text-white" style={{ backgroundColor: '#002B5C' }}>
                  <tr className="text-center">
                    <th className="py-3 text-start ps-2 ps-md-4 fw-normal">Smart Buses Routes</th>
                    {/* Removed d-none d-md-table-cell to show on mobile */}
                    <th className="py-3 fw-normal">First Bus</th>
                    <th className="py-3 fw-normal">Last Bus</th>
                    <th className="py-3 fw-normal">No. of Buses</th>
                    <th className="py-3 fw-normal">Min. Fare</th>
                    <th className="py-3"></th>
                  </tr>
                </thead>

                <tbody>
                  {routes.map((item, idx) => (
                    <tr key={idx} className="text-center custom-row">
                      <td className="text-start ps-2 ps-md-4 py-3 fw-medium route-text">
                        {item.route}
                        {/* Removed the extra text underneath that was showing only on mobile */}
                      </td>
                      {/* Removed d-none d-md-table-cell to show on mobile */}
                      <td className="small">{item.first}</td>
                      <td className="small">{item.last}</td>
                      <td className="small">{item.count}</td>
                      <td className="fw-bold">₹ {item.fare}</td>
                      <td className="pe-2 pe-md-4 text-end">
                        {/* Book Now logic added here */}
                        <button 
                          onClick={() => handleBooking(item.source, item.dest)}
                          className="btn btn-sm px-3 fw-normal book-btn text-white w-100 w-md-50 mobile-btn-resize"
                          style={{ backgroundColor: '#c75318', border: 'none' }}
                        >
                          Book Now
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        </div>

        {/* --- BOTTOM SECTION: CONTACT US --- */}
        <section
          className="position-relative overflow-hidden w-100 mt-5"
          style={{
            backgroundColor: '#001D3D',
            backgroundImage: `url(${handImage.src})`,
            backgroundSize: 'cover',
            backgroundPosition: 'left center',
            backgroundRepeat: 'no-repeat',
            minHeight: '400px',
            color: 'white',
          }}
        >
          <div className="container-fluid py-5 h-100" style={{ zIndex: 2, position: 'relative' }}>
            <div className="row align-items-center h-100">
              <div className="col-lg-7 col-md-12 px-5">
                <h2 className="display-6 fw-bold mb-5">Contact Us for Information</h2>

                <div className="mb-5 position-relative ps-4">
                  <div
                    className="position-absolute start-0 h-100"
                    style={{ width: '4px', backgroundColor: '#FFD700', top: 0 }}
                  ></div>
                  <p className="text-uppercase small mb-1 opacity-75 fw-bold">
                    For Reservation Related Queries
                  </p>
                  <h1 className="fw-bold mb-1" style={{ color: '#FFD700' }}>
                    +91 98884 17555
                  </h1>
                  <p className="mb-0 opacity-90">wecare@yesgobus.com</p>
                </div>

                <div className="position-relative ps-4">
                  <div
                    className="position-absolute start-0 h-100"
                    style={{ width: '4px', backgroundColor: '#FFD700', top: 0 }}
                  ></div>
                  <p className="text-uppercase small mb-1 opacity-75 fw-bold">
                    E-Ticketing & E-Payment Related Issues
                  </p>
                  <h1 className="fw-bold mb-1" style={{ color: '#FFD700' }}>
                    +91 98884 17555
                  </h1>
                  <p className="mb-0 opacity-90">support@yesgobus.com</p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
      <Hom3 />
    </main>
  );
};

export default PopularRoutesAndContact;