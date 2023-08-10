cmake_minimum_required(VERSION 3.20)
PROJECT(chilly_solver CXX)

set(CMAKE_EXPORT_COMPILE_COMMANDS true)

set(CMAKE_CXX_STANDARD 20)

if (UNIX)
	set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -Wall")
	set(CMAKE_CXX_FLAGS_DEBUG "${CMAKE_CXX_FLAGS} -pedantic -glldb")
	set(CMAKE_CXX_FLAGS_RELEASE "${CMAKE_CXX_FLAGS} -O3")
endif (UNIX)

if (MSVC)
	set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} /Wall /wd4365 /wd4710 /wd4711")
	set(CMAKE_CXX_FLAGS_DEBUG "${CMAKE_CXX_FLAGS} /Od")
	set(CMAKE_CXX_FLAGS_RELEASE "${CMAKE_CXX_FLAGS} /O2")
endif (MSVC)

set(BOOST_ROOT $ENV{BOOST_ROOT})
find_package(Boost 1.81.0 REQUIRED COMPONENTS json)
# find_package(Boost 1.81.0 REQUIRED)
message(STATUS "Boost include dirs: ${Boost_INCLUDE_DIRS}")
message(STATUS "Boost lib dirs: ${Boost_LIBRARY_DIRS}")
message(STATUS "Boost libs: ${Boost_LIBRARIES}")


add_executable(chilly_solver 
  src/solver-main.cpp
  src/chilly.cpp
)

if(CMAKE_BUILD_TYPE STREQUAL "Release")
  if (UNIX)
    add_custom_command(TARGET chilly_solver POST_BUILD COMMAND strip chilly_solver)
  endif (UNIX)
endif()


target_include_directories(chilly_solver
	PRIVATE ${PROJECT_INCLUDE_DIRS}
	PUBLIC ${Boost_INCLUDE_DIRS})

target_link_libraries(chilly_solver
	${Boost_LIBRARIES}
)

install(TARGETS chilly_solver
  CONFIGURATIONS Release
  RUNTIME DESTINATION "$ENV{HOME}/bin")

